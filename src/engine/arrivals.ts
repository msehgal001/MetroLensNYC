/**
 * Live arrivals.
 *
 * `ArrivalsProvider` is the seam a real feed plugs into. `SimulatedArrivals` derives a
 * deterministic timetable from each line's scheduled headway plus a per-trip jitter, so
 * the countdown behaves like a real feed (trains bunch, some run late, the clock ticks
 * down second by second) without inventing different numbers on every render.
 *
 * To go live against the MTA GTFS-Realtime feeds, implement `ArrivalsProvider.at()`
 * against the feed and swap the instance in `AppProvider` — nothing else changes.
 */

import type { Arrival, Dir, LineId, ServiceAlert, Station } from '../types';
import { LINE_BY_ID, STATION_BY_ID, hash, headwayFor, linesServing, neighborStop, stopIndex, terminalFor } from './shared';
import { live } from './live';

export interface ArrivalsQuery {
  stationId: string;
  /** Restrict to one platform's lines. */
  trunk?: string;
  dir?: Dir;
  now: Date;
  alerts?: ServiceAlert[];
  limit?: number;
}

export interface ArrivalsProvider {
  readonly source: string;
  at(query: ArrivalsQuery): Arrival[];
}

function factorFor(line: LineId, alerts: ServiceAlert[] | undefined): number {
  if (!alerts) return 1;
  let f = 1;
  for (const a of alerts) if (a.headwayFactor && a.lines.includes(line)) f = Math.max(f, a.headwayFactor);
  return f;
}

function delayedAt(line: LineId, stationId: string, alerts: ServiceAlert[] | undefined): boolean {
  if (!alerts) return false;
  return alerts.some(
    (a) => a.kind === 'delay' && a.lines.includes(line) && (a.stations.includes(stationId) || !a.stations.length),
  );
}

export class SimulatedArrivals implements ArrivalsProvider {
  readonly source = 'Simulated feed';

  at(query: ArrivalsQuery): Arrival[] {
    const station: Station | undefined = STATION_BY_ID[query.stationId];
    if (!station) return [];
    const nowSec = Math.floor(query.now.getTime() / 1000);
    const out: Arrival[] = [];

    for (const platform of station.platforms) {
      if (query.trunk && platform.trunk !== query.trunk) continue;
      for (const lineId of linesServing(platform, station.id)) {
        const line = LINE_BY_ID[lineId];
        if (!line) continue;
        for (const dir of ['A', 'B'] as Dir[]) {
          if (query.dir && dir !== query.dir) continue;
          if (!neighborStop(line, station.id, dir)) continue;
          const headway = Math.round(headwayFor(line, query.now) * factorFor(lineId, query.alerts));
          if (!headway) continue;
          // Anchor the timetable so a given line/dir/station always yields the same
          // sequence of trains for a given wall-clock second.
          const seed = hash(`${lineId}|${dir}|${station.id}`);
          const offset = seed % headway;
          const first = headway - ((nowSec - offset) % headway);
          const late = delayedAt(lineId, station.id, query.alerts);
          for (let n = 0; n < 4; n++) {
            const tripIndex = Math.floor((nowSec - offset) / headway) + n + 1;
            const jitter = ((hash(`${lineId}|${dir}|${tripIndex}`) % 121) - 60) * (late ? 2.2 : 1);
            const eta = Math.max(0, Math.round(first + n * headway + jitter));
            if (eta > 22 * 60) continue;
            out.push({
              id: `${lineId}-${dir}-${tripIndex}`,
              line: lineId,
              lineName: line.name,
              kind: line.kind,
              dir,
              stationId: station.id,
              trunk: platform.trunk,
              eta,
              toward: terminalFor(line, dir),
              cars: line.cars,
              status: late ? 'delayed' : jitter > 45 ? 'holding' : 'on-time',
            });
          }
        }
      }
    }

    out.sort((a, b) => a.eta - b.eta);
    return query.limit ? out.slice(0, query.limit) : out;
  }
}

const simulated = new SimulatedArrivals();

/**
 * Live-first provider: real MTA arrivals whenever the feed is fresh, the simulated
 * timetable otherwise. Screens surface which one they are looking at via
 * `arrivalsSourceLabel` in live.ts.
 */
export class HybridArrivals implements ArrivalsProvider {
  get source(): string {
    return live.status === 'live' ? 'MTA GTFS-Realtime' : simulated.source;
  }

  at(query: ArrivalsQuery): Arrival[] {
    const nowMs = query.now.getTime();
    const liveList = live.arrivalsFor(query.stationId, nowMs);
    if (liveList) {
      const filtered = liveList.filter(
        (a) => (!query.trunk || a.trunk === query.trunk) && (!query.dir || a.dir === query.dir),
      );
      return query.limit ? filtered.slice(0, query.limit) : filtered;
    }
    return simulated.at(query);
  }
}

export const arrivals: ArrivalsProvider = new HybridArrivals();

/**
 * `precise` shows a second-by-second countdown — worth it for the train the rider is
 * actually waiting for, noise for everything else on the board.
 */
export function etaLabel(seconds: number, precise = false): string {
  if (seconds <= 20) return 'Now';
  if (seconds < 60) return precise ? `${seconds}s` : '1 min';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (precise && m < 10) return `${m}:${String(s).padStart(2, '0')}`;
  return `${m} min`;
}

/** Does this arrival get the rider to `destination`? */
export function arrivalServes(a: Arrival, destinationStationId: string): boolean {
  const iHere = stopIndex(a.line, a.stationId);
  const iThere = stopIndex(a.line, destinationStationId);
  if (iHere < 0 || iThere < 0) return false;
  return a.dir === 'B' ? iThere > iHere : iThere < iHere;
}
