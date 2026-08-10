/**
 * Live MTA data.
 *
 * Three real sources, each with an honest fallback:
 *
 *  1. Station registry — the official "MTA Subway Stations" dataset (data.ny.gov,
 *     39hk-dx4f): GTFS stop ids, coordinates, served routes and real ADA flags.
 *     Our curated stations are matched to official ones at runtime by proximity +
 *     route overlap, and official ADA status overrides the authored flags.
 *
 *  2. Arrivals — the MTA's GTFS-Realtime feeds, read as JSON through Transiter's
 *     public NYC instance (proxied at /live, see vite.config.ts). Every train shown
 *     is a real train; when the feed is unreachable the simulated timetable takes
 *     over and the UI says so.
 *
 *  3. Alerts — the MTA's service-alerts JSON (proxied at /mta). Unreachable in some
 *     networks; the curated sample alerts remain, labeled as samples.
 *
 * Parsing is pure and unit-tested; fetching/polling lives at the edges.
 */

import type { Arrival, Dir, LineId, ServiceAlert } from '../types';
import { LINE_BY_ID, STATIONS, STATION_BY_ID, haversine } from './shared';

// ————————————————————————————————— tiny fetch helpers

const CSV_URL = 'https://data.ny.gov/api/views/39hk-dx4f/rows.csv?accessType=DOWNLOAD';
const LIVE_BASE = '/live/systems/us-ny-subway';
const MTA_ALERTS = '/mta/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json';
const MTA_ALERTS_DIRECT = 'https://api-endpoints.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts.json';

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(ms) });
}

// ————————————————————————————————— official station registry

export interface OfficialStation {
  gtfsId: string;
  name: string;
  routes: string[];
  lat: number;
  lon: number;
  ada: boolean;
  northLabel: string;
  southLabel: string;
}

/** Minimal CSV parser that copes with quoted fields (station names contain commas). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parseStationsCsv(text: string): OfficialStation[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0];
  const col = (name: string) => header.findIndex((h) => h.trim() === name);
  const iGtfs = col('GTFS Stop ID');
  const iName = col('Stop Name');
  const iRoutes = col('Daytime Routes');
  const iLat = col('GTFS Latitude');
  const iLon = col('GTFS Longitude');
  const iAda = col('ADA');
  const iN = col('North Direction Label');
  const iS = col('South Direction Label');
  if (iGtfs < 0 || iLat < 0) return [];
  return rows.slice(1).map((r) => ({
    gtfsId: r[iGtfs],
    name: r[iName] ?? '',
    routes: (r[iRoutes] ?? '').split(/\s+/).filter(Boolean),
    lat: Number(r[iLat]),
    lon: Number(r[iLon]),
    ada: r[iAda] === '1' || r[iAda]?.toLowerCase() === 'true',
    northLabel: r[iN] ?? '',
    southLabel: r[iS] ?? '',
  })).filter((s) => s.gtfsId && Number.isFinite(s.lat));
}

/**
 * Match our stations to official GTFS stations by proximity + route overlap.
 * A complex like Times Sq maps to several GTFS stations (127, R16, 725, 902) —
 * one per trunk — and arrivals from all of them are merged.
 */
export function matchStations(official: OfficialStation[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const st of STATIONS) {
    const hits = official
      .map((o) => ({ o, d: haversine(st.lat, st.lon, o.lat, o.lon) }))
      .filter(({ o, d }) => d < 320 && o.routes.some((r) => (st.lines as string[]).includes(normalizeRoute(r))))
      .sort((a, b) => a.d - b.d)
      .map(({ o }) => o.gtfsId);
    if (hits.length) map.set(st.id, [...new Set(hits)].slice(0, 4));
  }
  return map;
}

/** Official ADA status overrides the authored flags — the real network wins. */
export function applyOfficialAda(official: OfficialStation[]): number {
  let changed = 0;
  for (const st of STATIONS) {
    const near = official
      .map((o) => ({ o, d: haversine(st.lat, st.lon, o.lat, o.lon) }))
      .filter(({ o, d }) => d < 320 && o.routes.some((r) => (st.lines as string[]).includes(normalizeRoute(r))));
    if (!near.length) continue;
    const ada = near.some(({ o }) => o.ada);
    if (st.ada !== ada) {
      st.ada = ada;
      changed++;
    }
  }
  return changed;
}

// ————————————————————————————————— live arrivals (Transiter → MTA GTFS-RT)

/** Express/shuttle GTFS route ids → the line the rider knows. */
export function normalizeRoute(routeId: string): string {
  if (routeId === 'GS') return 'S';
  if (routeId.endsWith('X')) return routeId.slice(0, -1);
  return routeId;
}

/**
 * GTFS stop-id suffix → our direction. N is "railroad north" = our dirA everywhere
 * except the Flushing line, where N means toward Flushing (our dirB). Verified against
 * the live feed for the 7, L, G and the shuttle.
 */
export function gtfsDir(line: LineId, suffix: string): Dir | null {
  if (suffix !== 'N' && suffix !== 'S') return null;
  const northIsA = line !== '7';
  return suffix === 'N' ? (northIsA ? 'A' : 'B') : northIsA ? 'B' : 'A';
}

interface TransiterStopTime {
  arrival?: { time?: string | number };
  departure?: { time?: string | number };
  stop?: { id?: string };
  trip?: {
    id?: string;
    route?: { id?: string };
    destination?: { name?: string };
  };
}

export interface TransiterStopResponse {
  id?: string;
  name?: string;
  stopTimes?: TransiterStopTime[];
}

/** Turn one Transiter stop response into Arrivals for one of our stations. */
export function parseTransiterStop(
  json: TransiterStopResponse,
  ourStationId: string,
  nowMs: number,
): Arrival[] {
  const out: Arrival[] = [];
  const station = STATION_BY_ID[ourStationId];
  if (!station) return out;
  for (const st of json.stopTimes ?? []) {
    const rawRoute = st.trip?.route?.id;
    if (!rawRoute) continue;
    const lineId = normalizeRoute(rawRoute) as LineId;
    const line = LINE_BY_ID[lineId];
    if (!line) continue;
    const gtfsStop = st.stop?.id ?? '';
    const dir = gtfsDir(lineId, gtfsStop.slice(-1));
    if (!dir) continue;
    const when = Number(st.arrival?.time ?? st.departure?.time);
    if (!Number.isFinite(when) || when <= 0) continue;
    const eta = Math.round(when - nowMs / 1000);
    if (eta < -30 || eta > 45 * 60) continue;
    const platform = station.platforms.find((p) => (p.lines as string[]).includes(lineId));
    if (!platform) continue;
    out.push({
      id: `live-${st.trip?.id ?? `${lineId}-${when}`}`,
      line: lineId,
      lineName: line.name,
      kind: line.kind,
      dir,
      stationId: ourStationId,
      trunk: platform.trunk,
      eta: Math.max(0, eta),
      toward: st.trip?.destination?.name ?? (dir === 'A' ? line.termA : line.termB),
      cars: line.cars,
      status: 'on-time',
    });
  }
  out.sort((a, b) => a.eta - b.eta);
  return out;
}

// ————————————————————————————————— live alerts (MTA service-alerts JSON)

interface MtaAlertEntity {
  alert?: {
    'informed_entity'?: { 'route_id'?: string; 'stop_id'?: string }[];
    'header_text'?: { translation?: { text?: string; language?: string }[] };
    'description_text'?: { translation?: { text?: string; language?: string }[] };
    'active_period'?: { start?: number; end?: number }[];
    'transit_realtime.mercury_alert'?: { 'alert_type'?: string; 'human_readable_active_period'?: { translation?: { text?: string }[] } };
  };
}

function englishText(t?: { translation?: { text?: string; language?: string }[] }): string {
  const list = t?.translation ?? [];
  const en = list.find((x) => !x.language || x.language.startsWith('en'));
  return (en ?? list[0])?.text ?? '';
}

function classifyAlert(type: string, header: string): ServiceAlert['kind'] {
  const s = `${type} ${header}`.toLowerCase();
  if (s.includes('elevator') || s.includes('escalator')) return 'elevator';
  if (s.includes('delay')) return 'delay';
  if (s.includes('crowd')) return 'crowding';
  if (s.includes('entrance') || s.includes('stair')) return 'entrance';
  return 'service';
}

/** Map MTA alert JSON into our ServiceAlert model, scoping stops to our stations. */
export function parseMtaAlerts(
  json: { entity?: MtaAlertEntity[] },
  gtfsToOurs: Map<string, string>,
  nowMs: number,
): ServiceAlert[] {
  const out: ServiceAlert[] = [];
  const nowSec = nowMs / 1000;
  for (const [i, e] of (json.entity ?? []).entries()) {
    const a = e.alert;
    if (!a) continue;
    const periods = a['active_period'] ?? [];
    const active =
      !periods.length ||
      periods.some((p) => (!p.start || p.start <= nowSec) && (!p.end || p.end >= nowSec));
    if (!active) continue;
    const header = englishText(a['header_text']);
    if (!header) continue;
    const mercury = a['transit_realtime.mercury_alert'];
    const type = mercury?.['alert_type'] ?? '';
    const lines = [
      ...new Set(
        (a['informed_entity'] ?? [])
          .map((x) => x['route_id'])
          .filter((r): r is string => !!r && !!LINE_BY_ID[normalizeRoute(r)])
          .map((r) => normalizeRoute(r) as LineId),
      ),
    ];
    const stations = [
      ...new Set(
        (a['informed_entity'] ?? [])
          .map((x) => x['stop_id'])
          .filter((s): s is string => !!s)
          .map((s) => gtfsToOurs.get(s.replace(/[NS]$/, '')))
          .filter((s): s is string => !!s),
      ),
    ];
    if (!lines.length && !stations.length) continue;
    const kind = classifyAlert(type, header);
    out.push({
      id: `mta-${i}-${header.slice(0, 24)}`,
      kind,
      severity: kind === 'delay' ? 'high' : kind === 'elevator' ? 'medium' : 'low',
      title: type && !header.toLowerCase().startsWith(type.toLowerCase()) ? `${type} — ${header}` : header,
      body: englishText(a['description_text']) || header,
      lines,
      stations,
      headwayFactor: kind === 'delay' ? 1.5 : undefined,
      delaySeconds: kind === 'delay' ? 90 : undefined,
      until: englishText(mercury?.['human_readable_active_period'] as never) || 'Active now',
    });
  }
  return out.slice(0, 40);
}

// ————————————————————————————————— the polling store

export type LiveStatus = 'connecting' | 'live' | 'offline';

interface StationFeed {
  arrivals: Arrival[];
  fetchedAt: number;
}

const FRESH_MS = 90_000;
const POLL_MS = 30_000;

class LiveStore {
  status: LiveStatus = 'connecting';
  alertsStatus: LiveStatus = 'connecting';
  liveAlerts: ServiceAlert[] | null = null;
  adaApplied = false;

  private gtfsMap: Map<string, string[]> | null = null;
  private gtfsToOurs = new Map<string, string>();
  private feeds = new Map<string, StationFeed>();
  private watching = new Set<string>();
  private timer: number | null = null;
  private listeners = new Set<() => void>();
  private registryPromise: Promise<void> | null = null;

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  /** Load the official station registry once; apply ADA overlay; build both maps. */
  ensureRegistry(): Promise<void> {
    if (!this.registryPromise) {
      this.registryPromise = (async () => {
        const cached = this.loadCachedRegistry();
        const official = cached ?? (await this.fetchRegistry());
        if (!official) {
          this.status = 'offline';
          this.emit();
          return;
        }
        this.gtfsMap = matchStations(official);
        for (const [ours, ids] of this.gtfsMap) for (const id of ids) this.gtfsToOurs.set(id, ours);
        this.adaApplied = applyOfficialAda(official) >= 0;
        this.emit();
      })();
    }
    return this.registryPromise;
  }

  private loadCachedRegistry(): OfficialStation[] | null {
    try {
      const raw = localStorage.getItem('metrolens.stations.v1');
      if (!raw) return null;
      const { at, data } = JSON.parse(raw) as { at: number; data: OfficialStation[] };
      if (Date.now() - at > 7 * 86_400_000 || !Array.isArray(data) || !data.length) return null;
      return data;
    } catch {
      return null;
    }
  }

  private async fetchRegistry(): Promise<OfficialStation[] | null> {
    try {
      const res = await fetchWithTimeout(CSV_URL, 15_000);
      if (!res.ok) return null;
      const official = parseStationsCsv(await res.text());
      if (!official.length) return null;
      try {
        localStorage.setItem('metrolens.stations.v1', JSON.stringify({ at: Date.now(), data: official }));
      } catch {
        /* cache is best-effort */
      }
      return official;
    } catch {
      return null;
    }
  }

  /** Start (or keep) polling a station. Screens call this for the station they show. */
  watch(stationId: string) {
    if (this.watching.has(stationId)) return;
    this.watching.add(stationId);
    void this.refresh(stationId);
    if (this.timer == null && typeof window !== 'undefined') {
      this.timer = window.setInterval(() => {
        for (const id of this.watching) void this.refresh(id);
      }, POLL_MS);
    }
  }

  unwatch(stationId: string) {
    this.watching.delete(stationId);
    if (!this.watching.size && this.timer != null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async refresh(stationId: string) {
    await this.ensureRegistry();
    const gtfsIds = this.gtfsMap?.get(stationId);
    if (!gtfsIds?.length) {
      this.status = this.gtfsMap ? this.status : 'offline';
      return;
    }
    try {
      const parts = await Promise.all(
        gtfsIds.map(async (id) => {
          const res = await fetchWithTimeout(
            `${LIVE_BASE}/stops/${encodeURIComponent(id)}?skip_service_maps=true&skip_transfers=true`,
            12_000,
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return (await res.json()) as TransiterStopResponse;
        }),
      );
      const now = Date.now();
      const merged = parts.flatMap((p) => parseTransiterStop(p, stationId, now));
      merged.sort((a, b) => a.eta - b.eta);
      this.feeds.set(stationId, { arrivals: merged, fetchedAt: now });
      this.status = 'live';
      this.emit();
    } catch {
      if (this.status !== 'live' || Date.now() - (this.feeds.get(stationId)?.fetchedAt ?? 0) > FRESH_MS * 2) {
        this.status = 'offline';
        this.emit();
      }
    }
  }

  /** Fresh live arrivals for a station, with etas re-anchored to `nowMs`. */
  arrivalsFor(stationId: string, nowMs: number): Arrival[] | null {
    const feed = this.feeds.get(stationId);
    if (!feed || nowMs - feed.fetchedAt > FRESH_MS) return null;
    const drift = Math.round((nowMs - feed.fetchedAt) / 1000);
    return feed.arrivals
      .map((a) => ({ ...a, eta: Math.max(0, a.eta - drift) }))
      .filter((a) => a.eta > 0 || a.eta === 0);
  }

  isLive(stationId: string, nowMs: number): boolean {
    return this.arrivalsFor(stationId, nowMs) != null;
  }

  /** One attempt per session-load to pull real MTA alerts; refreshed every 2 min if it works. */
  async refreshAlerts(): Promise<ServiceAlert[] | null> {
    await this.ensureRegistry();
    for (const url of [MTA_ALERTS, MTA_ALERTS_DIRECT]) {
      try {
        const res = await fetchWithTimeout(url, 12_000);
        if (!res.ok) continue;
        const json = (await res.json()) as { entity?: MtaAlertEntity[] };
        const alerts = parseMtaAlerts(json, this.gtfsToOurs, Date.now());
        if (alerts.length) {
          this.liveAlerts = alerts;
          this.alertsStatus = 'live';
          this.emit();
          return alerts;
        }
      } catch {
        /* try the next url */
      }
    }
    this.alertsStatus = 'offline';
    this.emit();
    return null;
  }

  gtfsIdsFor(stationId: string): string[] {
    return this.gtfsMap?.get(stationId) ?? [];
  }
}

export const live = new LiveStore();

export function arrivalsSourceLabel(stationId: string, nowMs: number): { live: boolean; label: string } {
  if (live.isLive(stationId, nowMs)) return { live: true, label: 'Live — MTA GTFS-Realtime' };
  if (live.status === 'connecting') return { live: false, label: 'Connecting to the MTA feed…' };
  return { live: false, label: 'Simulated timetable — live feed unreachable' };
}
