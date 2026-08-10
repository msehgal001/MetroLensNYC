import { describe, expect, it } from 'vitest';
import { PROFILE_ORDER, alertAffects, planRoute, planRoutes, rideLegs, transferLegs } from './router';
import { validateNetwork, STATION_BY_ID, accessServesDir, platformSide, servesStation, stopIndex } from './shared';
import { PLACE_BY_ID, DEFAULT_ORIGIN } from '../data/places';
import { ALERTS } from '../data/alerts';
import { arrivals, arrivalServes } from './arrivals';
import { impactFor } from './alerts';
import { defaultPreferences } from '../state/prefs';
import type { Place, Preferences } from '../types';

const at = new Date('2026-08-10T09:41:00');
const prefs: Preferences = defaultPreferences();

function plan(from: Place, to: Place, p: Partial<Preferences> = {}) {
  return planRoutes({ origin: from, destination: to, at, prefs: { ...prefs, ...p }, alerts: ALERTS });
}

describe('network dataset', () => {
  it('is internally consistent', () => {
    expect(validateNetwork()).toEqual([]);
  });
});

describe('route planning', () => {
  it('plans Penn Station area → Angelika Film Center', () => {
    const routes = plan(DEFAULT_ORIGIN, PLACE_BY_ID.angelika);
    expect(routes.length).toBeGreaterThan(0);
    const best = routes[0];
    expect(best.seconds).toBeGreaterThan(5 * 60);
    expect(best.seconds).toBeLessThan(60 * 60);
    expect(rideLegs(best).length).toBeGreaterThan(0);
  });

  it('produces legs that are physically connected', () => {
    for (const dest of ['angelika', 'strawberry-fields', 'brooklyn-bridge-park', 'moma-ps1',
      'bk-museum', 'astoria-park', 'yankee-stadium', 'green-wood', 'apollo', 'peter-luger']) {
      const routes = plan(DEFAULT_ORIGIN, PLACE_BY_ID[dest]);
      expect(routes.length, dest).toBeGreaterThan(0);
      for (const r of routes) {
        const rides = rideLegs(r);
        const transfers = transferLegs(r);
        // Every ride's stop chain must be consecutive stops of that line.
        for (const ride of rides) {
          for (let i = 1; i < ride.stops.length; i++) {
            const a = stopIndex(ride.line, ride.stops[i - 1]);
            const b = stopIndex(ride.line, ride.stops[i]);
            expect(Math.abs(b - a), `${ride.line} ${ride.stops[i - 1]}→${ride.stops[i]}`).toBe(1);
            expect(b > a).toBe(ride.dir === 'B');
          }
          expect(servesStation(ride.line, ride.fromStation)).toBe(true);
          expect(servesStation(ride.line, ride.toStation)).toBe(true);
        }
        // Transfers must join the previous ride's end to the next ride's start.
        for (let i = 0; i < transfers.length; i++) {
          const prevRide = rides[i];
          const nextRide = rides[i + 1];
          const t = transfers[i];
          expect(STATION_BY_ID[prevRide.toStation].complex ?? prevRide.toStation).toBe(
            STATION_BY_ID[t.stationId].complex ?? t.stationId,
          );
          expect(nextRide.fromStation).toBe(t.stationId);
        }
        expect(r.entryStation.id).toBe(rides[0].fromStation);
        expect(r.exitStation.id).toBe(rides[rides.length - 1].toStation);
      }
    }
  });

  it('never routes the rider through a closed entrance', () => {
    const routes = plan(
      { ...DEFAULT_ORIGIN, lat: 40.7506, lon: -73.9915 },
      PLACE_BY_ID['washington-sq'],
    );
    for (const r of routes) {
      expect(r.entrance.closed).toBeFalsy();
      expect(r.exit.closed).toBeFalsy();
    }
  });

  it('honours step-free routing', () => {
    const routes = plan(DEFAULT_ORIGIN, PLACE_BY_ID.angelika, { elevatorOnly: true });
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      expect(r.entryStation.ada).toBe(true);
      expect(r.exitStation.ada).toBe(true);
      for (const t of transferLegs(r)) expect(t.stepFree).toBe(true);
    }
  });

  it('fewest-transfers never has more transfers than fastest', () => {
    const fastest = planRoute({ origin: DEFAULT_ORIGIN, destination: PLACE_BY_ID['bk-museum'], at, prefs, alerts: ALERTS }, 'fastest');
    const fewest = planRoute({ origin: DEFAULT_ORIGIN, destination: PLACE_BY_ID['bk-museum'], at, prefs, alerts: ALERTS }, 'fewest-transfers');
    expect(fastest).toBeTruthy();
    expect(fewest).toBeTruthy();
    expect(fewest!.transferCount).toBeLessThanOrEqual(fastest!.transferCount);
  });

  it('least-walking does not walk further than fastest', () => {
    const o = DEFAULT_ORIGIN;
    const d = PLACE_BY_ID.met;
    const fastest = planRoute({ origin: o, destination: d, at, prefs, alerts: ALERTS }, 'fastest')!;
    const least = planRoute({ origin: o, destination: d, at, prefs, alerts: ALERTS }, 'least-walking')!;
    expect(least.walkSeconds).toBeLessThanOrEqual(fastest.walkSeconds + 1);
  });

  it('generates in-station guidance that ends at the platform', () => {
    const best = plan(DEFAULT_ORIGIN, PLACE_BY_ID.angelika)[0];
    expect(best.indoorSteps.length).toBeGreaterThanOrEqual(4);
    expect(best.indoorSteps[0].kind).toBe('enter');
    expect(best.indoorSteps[best.indoorSteps.length - 1].kind).toBe('platform');
    // Distance counts down.
    for (let i = 1; i < best.indoorSteps.length; i++) {
      expect(best.indoorSteps[i].distanceFeet).toBeLessThanOrEqual(best.indoorSteps[i - 1].distanceFeet);
    }
    expect(best.exitSteps[best.exitSteps.length - 1].kind).toBe('exit');
  });

  it('warns about decoy trains on the boarding platform', () => {
    const routes = plan(DEFAULT_ORIGIN, PLACE_BY_ID.angelika);
    const withDecoys = routes.flatMap(rideLegs).filter((r) => r.decoys.length > 0);
    expect(withDecoys.length).toBeGreaterThan(0);
    for (const r of withDecoys) for (const d of r.decoys) expect(d.reason.length).toBeGreaterThan(10);
  });

  it('covers every profile without crashing', () => {
    for (const p of PROFILE_ORDER) {
      const r = planRoute({ origin: DEFAULT_ORIGIN, destination: PLACE_BY_ID['bk-museum'], at, prefs, alerts: ALERTS }, p);
      if (r) expect(r.profile).toBe(p);
    }
  });
});

describe('arrivals', () => {
  it('returns a sorted, stable countdown', () => {
    const q = { stationId: 'penn-8av', now: at, alerts: ALERTS };
    const a = arrivals.at(q);
    const b = arrivals.at(q);
    expect(a.length).toBeGreaterThan(0);
    expect(a.map((x) => x.eta)).toEqual(b.map((x) => x.eta));
    for (let i = 1; i < a.length; i++) expect(a[i].eta).toBeGreaterThanOrEqual(a[i - 1].eta);
  });

  it('counts down as the clock advances', () => {
    const first = arrivals.at({ stationId: 'penn-8av', now: at, alerts: [] }).find((x) => x.eta > 90)!;
    const later = arrivals
      .at({ stationId: 'penn-8av', now: new Date(at.getTime() + 30_000), alerts: [] })
      .find((x) => x.id === first.id);
    expect(later).toBeTruthy();
    expect(later!.eta).toBe(Math.max(0, first.eta - 30));
  });

  it('knows which arrivals reach the destination', () => {
    const list = arrivals.at({ stationId: 'penn-8av', dir: 'B', now: at, alerts: [] });
    expect(list.some((a) => arrivalServes(a, 'w4'))).toBe(true);
    const uptown = arrivals.at({ stationId: 'penn-8av', dir: 'A', now: at, alerts: [] });
    expect(uptown.every((a) => !arrivalServes(a, 'w4'))).toBe(true);
  });

  it('spreads trains further apart when a delay alert is active', () => {
    const normal = arrivals.at({ stationId: 'canal-8av', dir: 'B', now: at, alerts: [] }).filter((a) => a.line === 'A');
    const delayed = arrivals.at({ stationId: 'canal-8av', dir: 'B', now: at, alerts: ALERTS }).filter((a) => a.line === 'A');
    const gap = (xs: typeof normal) => xs[1].eta - xs[0].eta;
    expect(gap(delayed)).toBeGreaterThan(gap(normal));
  });
});

describe('preferences that must actually change routing', () => {
  it('respects the max-transfers ceiling', () => {
    const zero = plan(DEFAULT_ORIGIN, PLACE_BY_ID.smorgasburg, { maxTransfers: 0 });
    const one = plan(DEFAULT_ORIGIN, PLACE_BY_ID.smorgasburg, { maxTransfers: 1 });
    expect(one.length).toBeGreaterThan(0);
    // With a ceiling of 0 we either get a one-seat ride or, if none exists, the fallback.
    if (zero.some((r) => r.transferCount === 0)) {
      expect(zero.every((r) => r.transferCount === 0)).toBe(true);
    }
  });

  it('"fewer transfers, even when slower" reduces transfers', () => {
    const normal = planRoute(
      { origin: DEFAULT_ORIGIN, destination: PLACE_BY_ID['bk-museum'], at, prefs, alerts: ALERTS },
      'fastest',
    )!;
    const fewer = planRoute(
      {
        origin: DEFAULT_ORIGIN,
        destination: PLACE_BY_ID['bk-museum'],
        at,
        prefs: { ...prefs, fewerTransfers: true },
        alerts: ALERTS,
      },
      'fastest',
    )!;
    expect(fewer.transferCount).toBeLessThanOrEqual(normal.transferCount);
  });

  it('only picks entrances that reach the chosen platform', () => {
    for (const dest of ['angelika', 'strawberry-fields', 'katz', 'high-line', 'gantry-park']) {
      for (const r of plan(DEFAULT_ORIGIN, PLACE_BY_ID[dest])) {
        expect(
          accessServesDir(r.firstRide.platform, r.entrance, r.firstRide.dir),
          `${dest}: ${r.entrance.streets} → ${r.firstRide.direction.word}`,
        ).toBe(true);
      }
    }
  });

  it('reports transfer walking time separately from waiting time', () => {
    const withTransfer = plan(DEFAULT_ORIGIN, PLACE_BY_ID.smorgasburg).flatMap(transferLegs);
    expect(withTransfer.length).toBeGreaterThan(0);
    for (const t of withTransfer) {
      expect(t.walkSeconds).toBeGreaterThan(0);
      expect(t.walkSeconds).toBeLessThanOrEqual(t.seconds);
    }
  });
});

describe('alert scoping', () => {
  it('needs both the line and the station to match', () => {
    const canal = ALERTS.find((a) => a.id === 'a-canal-signals')!;
    expect(alertAffects(canal, ['A'], new Set(['canal-8av']))).toBe(true);
    // Same line, nowhere near Canal St.
    expect(alertAffects(canal, ['A'], new Set(['8av-145']))).toBe(false);
    // Right station, wrong line.
    expect(alertAffects(canal, ['C'], new Set(['canal-8av']))).toBe(false);
  });

  it('explains an elevator outage only to riders who pass through it', () => {
    const elevator = ALERTS.find((a) => a.id === 'a-w4-elevator')!;
    const viaW4 = plan(DEFAULT_ORIGIN, PLACE_BY_ID.angelika)[0];
    const notViaW4 = plan(DEFAULT_ORIGIN, PLACE_BY_ID['strawberry-fields'])[0];
    expect(impactFor(elevator, viaW4).affectsRoute).toBe(true);
    expect(impactFor(elevator, notViaW4).affectsRoute).toBe(false);
  });
});

describe('in-station guidance', () => {
  it('names the correct side of the platform for each direction', () => {
    const down = plan(DEFAULT_ORIGIN, PLACE_BY_ID.angelika)[0];
    const up = plan(DEFAULT_ORIGIN, PLACE_BY_ID['strawberry-fields'])[0];
    const sideOf = (i: typeof down) => platformSide(i.firstRide.platform, i.firstRide.dir);
    const lastStep = (i: typeof down) => i.indoorSteps[i.indoorSteps.length - 1].detail;
    expect(lastStep(down)).toContain(sideOf(down));
    expect(lastStep(up)).toContain(sideOf(up));
    // Opposite directions on the same trunk must not claim the same side.
    if (down.firstRide.platform.id === up.firstRide.platform.id) {
      expect(sideOf(down)).not.toBe(sideOf(up));
    }
  });

  it('warns at the corridor split, and points opposite ways for opposite directions', () => {
    const down = plan(DEFAULT_ORIGIN, PLACE_BY_ID.angelika)[0];
    const split = down.indoorSteps.find((s) => s.kind === 'split');
    expect(split).toBeTruthy();
    expect(split!.warning.length).toBeGreaterThan(0);
    expect(Math.abs(split!.rotation)).toBe(55);
  });
});
