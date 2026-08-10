/** Derived network graph helpers: geometry, platform lookup, ride times, validation. */

import type { AccessPoint, Dir, DirectionInfo, Line, LineId, Platform, Station } from '../types';
import { LINES, LINE_BY_ID, TRUNKS } from './lines';
import { STATIONS, STATION_BY_ID } from './stations';

export { LINES, LINE_BY_ID, TRUNKS, STATIONS, STATION_BY_ID };

// ————————————————————————————————— geometry

const R_EARTH = 6371000;
const DEG = Math.PI / 180;

export function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = (bLat - aLat) * DEG;
  const dLon = (bLon - aLon) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(s));
}

export function bearingTo(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const y = Math.sin((bLon - aLon) * DEG) * Math.cos(bLat * DEG);
  const x =
    Math.cos(aLat * DEG) * Math.sin(bLat * DEG) -
    Math.sin(aLat * DEG) * Math.cos(bLat * DEG) * Math.cos((bLon - aLon) * DEG);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

export function compassWord(bearing: number): string {
  return COMPASS[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
}

/** Walking pace in m/s. Slower when the rider prefers step-free routes. */
export const WALK_PACE = 1.34;
export const WALK_PACE_SLOW = 1.05;

export function walkSeconds(meters: number, pace = WALK_PACE): number {
  // 1.25 detour factor: streets are not straight lines.
  return Math.round((meters * 1.25) / pace);
}

export function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

// ————————————————————————————————— platform lookup

const PLATFORM_INDEX = new Map<string, Platform>();
for (const st of STATIONS) {
  for (const p of st.platforms) {
    for (const l of p.lines) PLATFORM_INDEX.set(`${l}|${st.id}`, p);
  }
}

export function platformFor(line: LineId, stationId: string): Platform | undefined {
  return PLATFORM_INDEX.get(`${line}|${stationId}`);
}

export function directionInfo(platform: Platform, dir: Dir): DirectionInfo {
  const t = TRUNKS[platform.trunk];
  return dir === 'A' ? t.dirA : t.dirB;
}

/** Which side of the platform trains for `dir` arrive on. `sideB` is authored for dirB. */
export function platformSide(platform: Platform, dir: Dir): 'LEFT' | 'RIGHT' {
  if (dir === 'B') return platform.sideB;
  return platform.sideB === 'LEFT' ? 'RIGHT' : 'LEFT';
}

/** Which way to keep at the corridor split to reach the `dir` platform. */
export function splitSide(platform: Platform, dir: Dir): 'left' | 'right' {
  if (dir === 'B') return platform.splitB;
  return platform.splitB === 'left' ? 'right' : 'left';
}

/** Line stop index, or -1. */
const STOP_INDEX = new Map<string, number>();
for (const l of LINES) l.stops.forEach((s, i) => STOP_INDEX.set(`${l.id}|${s}`, i));

export function stopIndex(line: LineId, stationId: string): number {
  return STOP_INDEX.get(`${line}|${stationId}`) ?? -1;
}

export function servesStation(line: LineId, stationId: string): boolean {
  return STOP_INDEX.has(`${line}|${stationId}`);
}

/** Direction a rider travels on `line` to get from a to b, or undefined. */
export function dirBetween(line: LineId, a: string, b: string): Dir | undefined {
  const ia = stopIndex(line, a);
  const ib = stopIndex(line, b);
  if (ia < 0 || ib < 0 || ia === ib) return undefined;
  return ib > ia ? 'B' : 'A';
}

export function neighborStop(line: Line, stationId: string, dir: Dir): string | undefined {
  const i = stopIndex(line.id, stationId);
  if (i < 0) return undefined;
  const j = dir === 'B' ? i + 1 : i - 1;
  return line.stops[j];
}

export function terminalFor(line: Line, dir: Dir): string {
  return dir === 'A' ? line.termA : line.termB;
}

// ————————————————————————————————— ride times

const RIDE_CACHE = new Map<string, number>();

/** Seconds to travel one hop, including dwell at the arriving station. */
export function hopSeconds(line: Line, from: string, to: string): number {
  const key = `${line.id}|${from}|${to}`;
  const hit = RIDE_CACHE.get(key);
  if (hit != null) return hit;
  const a = STATION_BY_ID[from];
  const b = STATION_BY_ID[to];
  if (!a || !b) return 120;
  const meters = haversine(a.lat, a.lon, b.lat, b.lon);
  const cruise = line.kind === 'EXPRESS' ? 13.4 : 11.2;
  const seconds = Math.round(22 + meters / cruise);
  RIDE_CACHE.set(key, seconds);
  return seconds;
}

// ————————————————————————————————— complexes & transfers

const COMPLEX_PEERS = new Map<string, Station[]>();
for (const st of STATIONS) {
  if (!st.complex) continue;
  const list = COMPLEX_PEERS.get(st.complex) ?? [];
  list.push(st);
  COMPLEX_PEERS.set(st.complex, list);
}

/** Stations reachable inside fare control from `stationId`, including itself. */
export function complexStations(stationId: string): Station[] {
  const st = STATION_BY_ID[stationId];
  if (!st) return [];
  if (!st.complex) return [st];
  return COMPLEX_PEERS.get(st.complex) ?? [st];
}

/** All platforms a rider can walk to from a platform without leaving the system. */
export function connectedPlatforms(platform: Platform): Platform[] {
  return complexStations(platform.stationId).flatMap((s) => s.platforms);
}

const LAYOUT_COST: Record<Platform['layout'], number> = { island: 0, side: 25, stacked: 40 };

/** Walking seconds between two platforms inside fare control. */
export function transferSeconds(from: Platform, to: Platform, pace = WALK_PACE): number {
  if (from.id === to.id) return 0;
  const sameStation = from.stationId === to.stationId;
  const depth = Math.abs(from.depth - to.depth);
  let seconds = sameStation ? 55 : 150;
  seconds += depth * 50;
  seconds += LAYOUT_COST[to.layout];
  if (!sameStation) {
    const a = STATION_BY_ID[from.stationId];
    const b = STATION_BY_ID[to.stationId];
    if (a && b) seconds += walkSeconds(haversine(a.lat, a.lon, b.lat, b.lon), pace);
  }
  return Math.round(seconds * (pace < WALK_PACE ? WALK_PACE / pace : 1));
}

/** Is the transfer between these platforms step-free? */
export function transferStepFree(from: Platform, to: Platform): boolean {
  if (from.depth === to.depth && from.stationId === to.stationId) return true;
  const a = STATION_BY_ID[from.stationId];
  const b = STATION_BY_ID[to.stationId];
  return !!a?.ada && !!b?.ada && !a.elevatorOut && !b.elevatorOut;
}

/** Seconds from the street, through the fare gates, down to a platform. */
export function accessSeconds(platform: Platform, stepFree: boolean): number {
  const base = 45 + platform.depth * 42;
  return Math.round(stepFree ? base * 1.45 : base);
}

// ————————————————————————————————— nearby stations

export interface NearbyStation {
  station: Station;
  meters: number;
  walkSeconds: number;
}

export function stationsNear(
  lat: number,
  lon: number,
  opts: { limit?: number; maxMeters?: number; pace?: number; requireAda?: boolean } = {},
): NearbyStation[] {
  const { limit = 6, maxMeters = 1400, pace = WALK_PACE, requireAda = false } = opts;
  return STATIONS.filter((s) => !requireAda || (s.ada && !s.elevatorOut))
    .map((station) => {
      const meters = haversine(lat, lon, station.lat, station.lon);
      return { station, meters, walkSeconds: walkSeconds(meters, pace) };
    })
    .filter((n) => n.meters <= maxMeters)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit);
}

/**
 * Does this street entrance reach the platform for `dir`?
 *
 * At island-platform stations both directions share one platform, so every entrance works.
 * At side-platform stations the two directions are on opposite sides of the tracks with no
 * crossover inside fare control, so an entrance on the wrong side of the street only
 * reaches the other direction — the classic way to end up going the wrong way.
 */
export function accessServesDir(platform: Platform, access: AccessPoint, dir: Dir): boolean {
  if (access.onlyDir) return access.onlyDir === dir;
  if (platform.layout !== 'side') return true;
  const northish = ['N', 'NE', 'NW', 'E'].includes(access.quadrant);
  const northishDir: Dir = platform.splitB === 'right' ? 'B' : 'A';
  const served: Dir = northish ? northishDir : northishDir === 'A' ? 'B' : 'A';
  return served === dir;
}

export function nearestAccess(
  station: Station,
  lat: number,
  lon: number,
  opts: { requireAda?: boolean; excludeIds?: Set<string>; serves?: (a: AccessPoint) => boolean } = {},
) {
  const candidates = station.access.filter(
    (a) =>
      !a.closed &&
      !opts.excludeIds?.has(a.id) &&
      (!opts.requireAda || a.ada) &&
      (!opts.serves || opts.serves(a)),
  );
  const pool = candidates.length ? candidates : station.access.filter((a) => !a.closed);
  const fallback = pool.length ? pool : station.access;
  return fallback
    .map((a) => ({ access: a, meters: haversine(lat, lon, a.lat, a.lon) }))
    .sort((x, y) => x.meters - y.meters)[0];
}

// ————————————————————————————————— service periods

export type ServicePeriod = 'peak' | 'day' | 'evening' | 'night';

export function servicePeriod(at: Date): ServicePeriod {
  const h = at.getHours();
  const weekday = at.getDay() >= 1 && at.getDay() <= 5;
  if (h < 5) return 'night';
  if (weekday && ((h >= 7 && h < 10) || (h >= 16 && h < 19))) return 'peak';
  if (h >= 21) return 'evening';
  return 'day';
}

export function headwayFor(line: Line, at: Date): number {
  return line.headway[servicePeriod(at)];
}

/** Lines that share a platform with `platform` and also stop at `station`. */
export function linesServing(platform: Platform, stationId: string): LineId[] {
  return platform.lines.filter((l) => servesStation(l, stationId));
}

/** Platform complexity, 0 (trivial) – 100 (labyrinth). Used by the "simplest platforms" profile. */
export function platformComplexity(station: Station, platform: Platform): number {
  let score = platform.depth * 16;
  score += LAYOUT_COST[platform.layout] * 0.6;
  score += (station.platforms.length - 1) * 9;
  score += station.crowd === 'heavy' ? 14 : station.crowd === 'moderate' ? 6 : 0;
  score += station.complex ? 10 : 0;
  if (!station.ada) score += 6;
  return Math.min(100, Math.round(score));
}

// ————————————————————————————————— validation

export function validateNetwork(): string[] {
  const errors: string[] = [];
  for (const line of LINES) {
    if (line.stops.length < 2) errors.push(`${line.id}: fewer than two stops`);
    const seen = new Set<string>();
    for (const id of line.stops) {
      if (seen.has(id)) errors.push(`${line.id}: duplicate stop ${id}`);
      seen.add(id);
      const st = STATION_BY_ID[id];
      if (!st) {
        errors.push(`${line.id}: unknown station ${id}`);
        continue;
      }
      if (!platformFor(line.id, id)) {
        errors.push(`${line.id}: station ${id} has no platform carrying line ${line.id}`);
      }
    }
  }
  for (const st of STATIONS) {
    if (!st.platforms.length) errors.push(`${st.id}: no platforms`);
    if (!st.access.length) errors.push(`${st.id}: no access points`);
    for (const p of st.platforms) {
      for (const l of p.lines) {
        if (!LINE_BY_ID[l]) errors.push(`${st.id}: platform lists unknown line ${l}`);
        else if (!servesStation(l, st.id)) {
          errors.push(`${st.id}: platform claims line ${l} but ${l} does not stop here`);
        }
      }
    }
  }
  return errors;
}
