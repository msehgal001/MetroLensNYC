/**
 * Route planner.
 *
 * The search graph has one node per (line, direction, station) — a rider standing on a
 * platform waiting for, or riding, a specific service. Edges are:
 *
 *   ride      → the next stop of that line in that direction
 *   transfer  → any other (line, direction, station) reachable inside fare control,
 *               costing the walk between platforms plus half a headway of waiting
 *
 * Entry costs (street walk + descending to the platform + initial wait) seed the search;
 * exit costs are added when a candidate destination platform is settled. Different route
 * profiles re-run the same search with different weights, which is what makes the
 * "Fastest / Fewest transfers / Least walking / Accessible / Simplest platforms" chips
 * produce genuinely different itineraries rather than relabelled copies.
 */

import type {
  AccessPoint,
  Dir,
  Itinerary,
  Leg,
  Line,
  LineId,
  Place,
  Platform,
  Preferences,
  RideLeg,
  RouteProfile,
  RouteProfileId,
  ServiceAlert,
  Station,
  TransferLeg,
  WalkLeg,
} from '../types';
import { entryRoute, exitRoute, transferRoute } from './indoor';
import {
  LINE_BY_ID,
  STATION_BY_ID,
  accessSeconds,
  accessServesDir,
  bearingTo,
  compassWord,
  complexStations,
  directionInfo,
  haversine,
  headwayFor,
  hopSeconds,
  linesServing,
  nearestAccess,
  neighborStop,
  platformComplexity,
  platformFor,
  servesStation,
  stationsNear,
  stopIndex,
  terminalFor,
  transferSeconds,
  transferStepFree,
  walkSeconds,
  WALK_PACE,
  WALK_PACE_SLOW,
} from './shared';

export const PROFILES: Record<RouteProfileId, RouteProfile> = {
  fastest: { id: 'fastest', label: 'Fastest', walkWeight: 1, transferPenalty: 60, complexityPenalty: 0, requireStepFree: false },
  'fewest-transfers': { id: 'fewest-transfers', label: 'Fewest transfers', walkWeight: 1.1, transferPenalty: 600, complexityPenalty: 0, requireStepFree: false },
  'least-walking': { id: 'least-walking', label: 'Least walking', walkWeight: 2.6, transferPenalty: 120, complexityPenalty: 0, requireStepFree: false },
  accessible: { id: 'accessible', label: 'Accessible', walkWeight: 1.3, transferPenalty: 300, complexityPenalty: 1.5, requireStepFree: true },
  'simplest-platforms': { id: 'simplest-platforms', label: 'Simplest platforms', walkWeight: 1.2, transferPenalty: 420, complexityPenalty: 6, requireStepFree: false },
};

export const PROFILE_ORDER: RouteProfileId[] = [
  'fastest',
  'fewest-transfers',
  'least-walking',
  'accessible',
  'simplest-platforms',
];

export interface PlanOptions {
  origin: Place;
  destination: Place;
  at: Date;
  prefs: Preferences;
  alerts?: ServiceAlert[];
  profiles?: RouteProfileId[];
}

// ————————————————————————————————— graph search

type NodeKey = string; // `${line}|${dir}|${station}`

interface Edge {
  kind: 'ride' | 'transfer';
  from: NodeKey;
  cost: number;
}

interface Seed {
  station: Station;
  access: AccessPoint;
  walkMeters: number;
  walkSecs: number;
}

function key(line: LineId, dir: Dir, station: string): NodeKey {
  return `${line}|${dir}|${station}`;
}

function parseKey(k: NodeKey): { line: LineId; dir: Dir; station: string } {
  const [line, dir, station] = k.split('|');
  return { line: line as LineId, dir: dir as Dir, station };
}

/** Minimal binary heap keyed on numeric priority. */
class Heap {
  private a: { k: NodeKey; p: number }[] = [];
  get size() {
    return this.a.length;
  }
  push(k: NodeKey, p: number) {
    const a = this.a;
    a.push({ k, p });
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent].p <= a[i].p) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }
  pop(): { k: NodeKey; p: number } | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].p < a[m].p) m = l;
        if (r < a.length && a[r].p < a[m].p) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

interface AlertIndex {
  headwayFactor: Map<LineId, number>;
  stationDelay: Map<string, number>;
  closedAccess: Set<string>;
  elevatorOut: Set<string>;
}

export function indexAlerts(alerts: ServiceAlert[]): AlertIndex {
  const headwayFactor = new Map<LineId, number>();
  const stationDelay = new Map<string, number>();
  const closedAccess = new Set<string>();
  const elevatorOut = new Set<string>();
  for (const a of alerts) {
    if (a.headwayFactor) {
      for (const l of a.lines) headwayFactor.set(l, Math.max(headwayFactor.get(l) ?? 1, a.headwayFactor));
    }
    if (a.delaySeconds) {
      for (const s of a.stations) stationDelay.set(s, (stationDelay.get(s) ?? 0) + a.delaySeconds);
    }
    for (const ap of a.accessPoints ?? []) closedAccess.add(ap);
    if (a.kind === 'elevator') for (const s of a.stations) elevatorOut.add(s);
  }
  return { headwayFactor, stationDelay, closedAccess, elevatorOut };
}

function waitSeconds(line: Line, at: Date, idx: AlertIndex): number {
  const factor = idx.headwayFactor.get(line.id) ?? 1;
  return Math.round((headwayFor(line, at) * factor) / 2);
}

interface SearchResult {
  path: NodeKey[];
  seed: Seed;
  exitStation: Station;
  exitAccess: AccessPoint;
  exitWalkMeters: number;
  exitWalkSecs: number;
  cost: number;
}

function search(
  opts: PlanOptions,
  profile: RouteProfile,
  idx: AlertIndex,
): SearchResult | null {
  const { origin, destination, at, prefs } = opts;
  const stepFree = profile.requireStepFree || prefs.elevatorOnly;
  const pace = prefs.avoidStairs || stepFree ? WALK_PACE_SLOW : WALK_PACE;
  // Riders will walk a long way when there is no closer station; the profile's
  // walkWeight is what discourages it, not a hard cap.
  const maxWalk = Math.max(1250, (prefs.walkingTolerance || 10) * 60 * pace);

  const originStations = stationsNear(origin.lat, origin.lon, {
    limit: 8,
    maxMeters: maxWalk,
    pace,
    requireAda: stepFree,
  });
  const destStations = stationsNear(destination.lat, destination.lon, {
    limit: 8,
    maxMeters: maxWalk,
    pace,
    requireAda: stepFree,
  });
  if (!originStations.length || !destStations.length) return null;

  const destIds = new Map(destStations.map((d) => [d.station.id, d]));
  const dist = new Map<NodeKey, number>();
  const prev = new Map<NodeKey, Edge>();
  const seedOf = new Map<NodeKey, Seed>();
  const heap = new Heap();

  const stationBlocked = (s: Station) => stepFree && (!s.ada || s.elevatorOut || idx.elevatorOut.has(s.id));
  // "Fewer transfers, even when slower" is a preference on top of the profile's own weight.
  const transferPenalty = profile.transferPenalty * (prefs.fewerTransfers ? 2.5 : 1);

  for (const near of originStations) {
    const st = near.station;
    if (stationBlocked(st)) continue;
    for (const platform of st.platforms) {
      const enter = accessSeconds(platform, stepFree);
      const complexityCost = platformComplexity(st, platform) * profile.complexityPenalty;
      for (const dir of ['A', 'B'] as Dir[]) {
        // The entrance has to actually reach this direction's platform.
        const acc = nearestAccess(st, origin.lat, origin.lon, {
          requireAda: stepFree || prefs.accessibleEntrances,
          excludeIds: idx.closedAccess,
          serves: (a) => accessServesDir(platform, a, dir),
        });
        if (!acc) continue;
        const walkM = haversine(origin.lat, origin.lon, acc.access.lat, acc.access.lon);
        const walkS = walkSeconds(walkM, pace);
        const seed: Seed = { station: st, access: acc.access, walkMeters: walkM, walkSecs: walkS };
        for (const lineId of linesServing(platform, st.id)) {
          const line = LINE_BY_ID[lineId];
          if (!line) continue;
          if (!neighborStop(line, st.id, dir)) continue;
          const k = key(lineId, dir, st.id);
          const cost = walkS * profile.walkWeight + enter + waitSeconds(line, at, idx) + complexityCost;
          if (cost < (dist.get(k) ?? Infinity)) {
            dist.set(k, cost);
            seedOf.set(k, seed);
            heap.push(k, cost);
          }
        }
      }
    }
  }

  let best: SearchResult | null = null;
  const settled = new Set<NodeKey>();

  while (heap.size) {
    const top = heap.pop()!;
    if (settled.has(top.k)) continue;
    if (top.p > (dist.get(top.k) ?? Infinity)) continue;
    settled.add(top.k);
    const { line: lineId, dir, station } = parseKey(top.k);
    const base = top.p;
    if (best && base >= best.cost) break;

    // Could we get out here?
    const destHit = destIds.get(station);
    if (destHit) {
      const st = destHit.station;
      const platform = platformFor(lineId, station);
      if (platform && !stationBlocked(st)) {
        const acc = nearestAccess(st, destination.lat, destination.lon, {
          requireAda: stepFree || prefs.accessibleEntrances,
          excludeIds: idx.closedAccess,
          serves: (a) => accessServesDir(platform, a, dir),
        });
        if (acc) {
          const walkM = haversine(acc.access.lat, acc.access.lon, destination.lat, destination.lon);
          const walkS = walkSeconds(walkM, pace);
          const total = base + accessSeconds(platform, stepFree) + walkS * profile.walkWeight;
          if (!best || total < best.cost) {
            const path: NodeKey[] = [];
            let cur: NodeKey | undefined = top.k;
            while (cur) {
              path.unshift(cur);
              cur = prev.get(cur)?.from;
            }
            best = {
              path,
              seed: seedOf.get(path[0])!,
              exitStation: st,
              exitAccess: acc.access,
              exitWalkMeters: walkM,
              exitWalkSecs: walkS,
              cost: total,
            };
          }
        }
      }
    }

    // ride to the next stop
    const line = LINE_BY_ID[lineId];
    const next = line ? neighborStop(line, station, dir) : undefined;
    if (line && next) {
      const nk = key(lineId, dir, next);
      const delay = idx.stationDelay.get(next) ?? 0;
      const cost = base + hopSeconds(line, station, next) + delay;
      if (cost < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, cost);
        prev.set(nk, { kind: 'ride', from: top.k, cost });
        seedOf.set(nk, seedOf.get(top.k)!);
        heap.push(nk, cost);
      }
    }

    // transfer to any other platform reachable inside fare control
    const here = platformFor(lineId, station);
    if (!here) continue;
    for (const peer of complexStations(station)) {
      if (stationBlocked(peer)) continue;
      for (const platform of peer.platforms) {
        const stepFreeOk = !stepFree || transferStepFree(here, platform);
        if (!stepFreeOk) continue;
        const samePlatform = platform.id === here.id;
        const walk = samePlatform ? 0 : transferSeconds(here, platform, pace);
        for (const otherLine of linesServing(platform, peer.id)) {
          const ol = LINE_BY_ID[otherLine];
          if (!ol) continue;
          for (const odir of ['A', 'B'] as Dir[]) {
            if (otherLine === lineId && odir === dir && peer.id === station) continue;
            if (!neighborStop(ol, peer.id, odir)) continue;
            const nk = key(otherLine, odir, peer.id);
            const penalty = samePlatform ? transferPenalty * 0.35 : transferPenalty;
            const complexityCost = platformComplexity(peer, platform) * profile.complexityPenalty * 0.5;
            const cost = base + walk + waitSeconds(ol, at, idx) + penalty + complexityCost;
            if (cost < (dist.get(nk) ?? Infinity)) {
              dist.set(nk, cost);
              prev.set(nk, { kind: 'transfer', from: top.k, cost });
              seedOf.set(nk, seedOf.get(top.k)!);
              heap.push(nk, cost);
            }
          }
        }
      }
    }
  }

  return best;
}

/**
 * An alert applies to a trip only when *both* of its scopes match: a signal problem at
 * Canal St is irrelevant to an uptown rider on the same line, and an elevator outage at
 * W 4 St is irrelevant to a rider who never goes there.
 */
export function alertAffects(alert: ServiceAlert, lines: LineId[], stations: Set<string>): boolean {
  const lineHit = !alert.lines.length || alert.lines.some((l) => lines.includes(l));
  const stationHit = !alert.stations.length || alert.stations.some((s) => stations.has(s));
  return lineHit && stationHit;
}

// ————————————————————————————————— itinerary construction

interface RideGroup {
  line: Line;
  dir: Dir;
  stops: string[];
}

function groupPath(path: NodeKey[]): RideGroup[] {
  const groups: RideGroup[] = [];
  for (const k of path) {
    const { line, dir, station } = parseKey(k);
    const last = groups[groups.length - 1];
    if (last && last.line.id === line && last.dir === dir) last.stops.push(station);
    else groups.push({ line: LINE_BY_ID[line], dir, stops: [station] });
  }
  return groups;
}

function decoyReason(decoy: Line, ride: RideGroup, alightStation: string): string {
  const passes = ride.stops.some((s) => servesStation(decoy.id, s) && s !== ride.stops[0]);
  const term = terminalFor(decoy, ride.dir);
  if (passes) {
    return decoy.kind === 'LOCAL'
      ? `The ${decoy.id} is the Local — it does not stop at ${STATION_BY_ID[alightStation]?.shortName ?? alightStation}.`
      : `The ${decoy.id} runs express past ${STATION_BY_ID[alightStation]?.shortName ?? alightStation}.`;
  }
  return `The ${decoy.id} branches away toward ${term} — do not board it.`;
}

function buildRideLeg(
  group: RideGroup,
  nextTransferAt: string | null,
  isLast: boolean,
): RideLeg {
  const boardId = group.stops[0];
  const alightId = group.stops[group.stops.length - 1];
  const platform = platformFor(group.line.id, boardId)!;
  const alightPlatform = platformFor(group.line.id, alightId)!;
  const info = directionInfo(platform, group.dir);
  const seconds = group.stops
    .slice(1)
    .reduce((acc, s, i) => acc + hopSeconds(group.line, group.stops[i], s), 0);

  const decoys: RideLeg['decoys'] = [];
  const alternates: RideLeg['alternates'] = [];
  for (const other of linesServing(platform, boardId)) {
    if (other === group.line.id) continue;
    const ol = LINE_BY_ID[other];
    if (!ol) continue;
    const iBoard = stopIndex(other, boardId);
    const iAlight = stopIndex(other, alightId);
    const sameWay = iBoard >= 0 && iAlight >= 0 && (group.dir === 'B' ? iAlight > iBoard : iAlight < iBoard);
    if (sameWay) {
      alternates.push({
        line: other,
        reason: `The ${other} also stops at ${STATION_BY_ID[alightId]?.shortName ?? alightId}.`,
      });
    } else {
      decoys.push({ line: other, reason: decoyReason(ol, group, alightId) });
    }
  }

  const boardCar = nextTransferAt ? alightPlatform.xferCar : alightPlatform.exitCar;
  const boardReason = nextTransferAt
    ? `Board the ${boardCar} cars — closest to your transfer passage at ${STATION_BY_ID[alightId]?.shortName ?? alightId}.`
    : `Board the ${boardCar} cars — closest to the exit stairs at ${STATION_BY_ID[alightId]?.shortName ?? alightId}.`;
  void isLast;

  return {
    type: 'ride',
    line: group.line.id,
    lineName: group.line.name,
    kind: group.line.kind,
    dir: group.dir,
    direction: info,
    trunk: platform.trunk,
    toward: terminalFor(group.line, group.dir),
    fromStation: boardId,
    toStation: alightId,
    stops: group.stops,
    seconds,
    platform,
    decoys,
    alternates,
    boardCar,
    boardReason,
  };
}

function buildTransferLeg(
  prevGroup: RideGroup,
  nextGroup: RideGroup,
  prefs: Preferences,
  pace: number,
  at: Date,
  idx: AlertIndex,
): TransferLeg {
  const fromStationId = prevGroup.stops[prevGroup.stops.length - 1];
  const toStationId = nextGroup.stops[0];
  const from = platformFor(prevGroup.line.id, fromStationId)!;
  const to = platformFor(nextGroup.line.id, toStationId)!;
  const station = STATION_BY_ID[toStationId];
  const walk = from.id === to.id ? 30 : transferSeconds(from, to, pace);
  return {
    type: 'transfer',
    stationId: toStationId,
    fromPlatform: from,
    toPlatform: to,
    fromLine: prevGroup.line.id,
    toLine: nextGroup.line.id,
    seconds: walk + waitSeconds(nextGroup.line, at, idx),
    walkSeconds: walk,
    sameLevel: from.depth === to.depth,
    stepFree: transferStepFree(from, to),
    steps: from.id === to.id ? [] : transferRoute(station, from, to, nextGroup.dir, prefs),
  };
}

function walkInstruction(from: { lat: number; lon: number }, to: { lat: number; lon: number }, label: string) {
  const b = bearingTo(from.lat, from.lon, to.lat, to.lon);
  return { bearing: b, text: `Head ${compassWord(b)} to ${label}.` };
}

function assemble(
  res: SearchResult,
  opts: PlanOptions,
  profile: RouteProfile,
  idx: AlertIndex,
): Itinerary | null {
  const { origin, destination, prefs } = opts;
  const stepFree = profile.requireStepFree || prefs.elevatorOnly;
  const pace = prefs.avoidStairs || stepFree ? WALK_PACE_SLOW : WALK_PACE;
  const groups = groupPath(res.path).filter((g) => g.stops.length > 1);
  if (!groups.length) return null;

  const legs: Leg[] = [];
  const startWalk = walkInstruction(origin, res.seed.access, `the ${res.seed.access.streets} entrance`);
  const walkIn: WalkLeg = {
    type: 'walk',
    seconds: res.seed.walkSecs,
    meters: res.seed.walkMeters,
    from: origin.name,
    to: `${res.seed.station.name} — ${res.seed.access.streets}`,
    bearing: startWalk.bearing,
    instruction: startWalk.text,
  };
  legs.push(walkIn);

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const nextG = groups[i + 1];
    if (i > 0) legs.push(buildTransferLeg(groups[i - 1], g, prefs, pace, opts.at, idx));
    legs.push(buildRideLeg(g, nextG ? nextG.stops[0] : null, !nextG));
  }

  const endWalk = walkInstruction(res.exitAccess, destination, destination.name);
  const walkOut: WalkLeg = {
    type: 'walk',
    seconds: res.exitWalkSecs,
    meters: res.exitWalkMeters,
    from: `${res.exitStation.name} — ${res.exitAccess.streets}`,
    to: destination.name,
    bearing: endWalk.bearing,
    instruction: `${Math.max(1, Math.round(res.exitWalkSecs / 60))} min walk to ${destination.name} — head ${compassWord(endWalk.bearing)} on ${res.exitAccess.streets.split(' & ').pop()}.`,
  };
  legs.push(walkOut);

  const rides = legs.filter((l): l is RideLeg => l.type === 'ride');
  if (!rides.length) return null;
  const firstRide = rides[0];
  const transfers = legs.filter((l): l is TransferLeg => l.type === 'transfer');
  const exitPlatform = platformFor(rides[rides.length - 1].line, res.exitStation.id) ?? firstRide.platform;
  const seconds =
    legs.reduce((a, l) => a + ('seconds' in l ? l.seconds : 0), 0) +
    accessSeconds(firstRide.platform, stepFree) +
    waitSeconds(LINE_BY_ID[firstRide.line], opts.at, idx) +
    accessSeconds(exitPlatform, stepFree);
  const walkTotal = walkIn.seconds + walkOut.seconds;

  const indoorSteps = entryRoute(res.seed.station, res.seed.access, firstRide.platform, firstRide.dir, prefs);
  const exitSteps = exitRoute(res.exitStation, exitPlatform, res.exitAccess, prefs);

  const complexity = Math.max(
    platformComplexity(res.seed.station, firstRide.platform),
    ...transfers.map((t) => platformComplexity(STATION_BY_ID[t.stationId], t.toPlatform)),
  );

  const warnings: string[] = [];
  const touched = new Set<string>([
    res.seed.station.id,
    res.exitStation.id,
    ...rides.flatMap((r) => r.stops),
    ...transfers.map((t) => t.stationId),
  ]);
  for (const alert of opts.alerts ?? []) {
    if (alertAffects(alert, rides.map((r) => r.line), touched)) warnings.push(alert.title);
  }

  return {
    id: `${profile.id}:${rides.map((r) => r.line).join('-')}:${res.seed.station.id}-${res.exitStation.id}`,
    profile: profile.id,
    label: profile.label,
    seconds: Math.round(seconds),
    walkSeconds: walkTotal,
    transferCount: transfers.length,
    legs,
    origin,
    destination,
    entryStation: res.seed.station,
    entrance: res.seed.access,
    exitStation: res.exitStation,
    exit: res.exitAccess,
    firstRide,
    indoorSteps,
    exitSteps,
    stepFree: stepFree || (res.seed.station.ada && res.exitStation.ada && transfers.every((t) => t.stepFree)),
    complexity,
    warnings,
  };
}

/** Plan one route for a single profile. */
export function planRoute(opts: PlanOptions, profileId: RouteProfileId): Itinerary | null {
  const profile = PROFILES[profileId];
  const idx = indexAlerts(opts.alerts ?? []);
  const res = search(opts, profile, idx);
  if (!res) return null;
  return assemble(res, opts, profile, idx);
}

/** Plan a set of distinct routes, best first. */
export function planRoutes(opts: PlanOptions): Itinerary[] {
  const profiles = opts.profiles ?? PROFILE_ORDER;
  const out: Itinerary[] = [];
  const seen = new Set<string>();
  for (const p of profiles) {
    const it = planRoute(opts, p);
    if (!it) continue;
    const sig = it.legs
      .filter((l): l is RideLeg => l.type === 'ride')
      .map((r) => `${r.line}${r.dir}${r.fromStation}>${r.toStation}`)
      .join('|');
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(it);
  }
  out.sort((a, b) => a.seconds - b.seconds);
  // Honour the rider's transfer ceiling, unless nothing at all would be left.
  const cap = opts.prefs.maxTransfers;
  const within = out.filter((r) => r.transferCount <= cap);
  return within.length ? within : out;
}

// ————————————————————————————————— presentation helpers

export function minutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

export function durationLabel(seconds: number): string {
  return `${minutes(seconds)} min`;
}

export function transfersLabel(n: number): string {
  return n === 0 ? 'No transfers' : n === 1 ? '1 transfer' : `${n} transfers`;
}

export function platformLabel(itin: Itinerary): string {
  const p = itin.firstRide.platform;
  return `${itin.firstRide.direction.word} ${linesServing(p, p.stationId).join('·')}`;
}

export function rideLegs(itin: Itinerary): RideLeg[] {
  return itin.legs.filter((l): l is RideLeg => l.type === 'ride');
}

export function transferLegs(itin: Itinerary): TransferLeg[] {
  return itin.legs.filter((l): l is TransferLeg => l.type === 'transfer');
}

export function walkLegs(itin: Itinerary): WalkLeg[] {
  return itin.legs.filter((l): l is WalkLeg => l.type === 'walk');
}

/** Lines shown as badges next to the platform name. */
export function platformBadges(platform: Platform, stationId: string) {
  return linesServing(platform, stationId).map((l) => {
    const line = LINE_BY_ID[l];
    return { L: l, bg: line.color, fg: line.textColor };
  });
}

export function oppositeDirWord(platform: Platform, dir: Dir): string {
  return directionInfo(platform, dir === 'A' ? 'B' : 'A').word;
}
