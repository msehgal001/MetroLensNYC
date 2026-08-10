/**
 * Turns raw service alerts into "what it means for you" — the only thing a rider
 * standing in a station actually needs from an alert.
 */

import type { Itinerary, LineId, RideLeg, ServiceAlert } from '../types';
import { LINE_BY_ID, STATION_BY_ID, linesServing, stopIndex } from './shared';
import { alertAffects, rideLegs, transferLegs } from './router';

export interface AlertImpact {
  alert: ServiceAlert;
  affectsRoute: boolean;
  headline: string;
  detail: string;
}

function backupLines(ride: RideLeg): LineId[] {
  const from = stopIndex(ride.line, ride.fromStation);
  return linesServing(ride.platform, ride.fromStation).filter((l) => {
    if (l === ride.line) return false;
    const a = stopIndex(l, ride.fromStation);
    const b = stopIndex(l, ride.toStation);
    if (a < 0 || b < 0) return false;
    return ride.dir === 'B' ? b > a && a >= 0 : b < a;
  }).filter(() => from >= 0);
}

export function impactFor(alert: ServiceAlert, itinerary: Itinerary | null): AlertImpact {
  if (!itinerary) {
    return {
      alert,
      affectsRoute: false,
      headline: 'Not on a planned route',
      detail: 'Plan a trip and MetroLens will tell you whether this affects it.',
    };
  }

  const rides = rideLegs(itinerary);
  const transfers = transferLegs(itinerary);
  const touched = new Set<string>([
    itinerary.entryStation.id,
    itinerary.exitStation.id,
    ...rides.flatMap((r) => r.stops),
    ...transfers.map((t) => t.stationId),
  ]);
  const hitRide = rides.find((r) => alert.lines.includes(r.line));
  const hitStation = alert.stations.find((s) => touched.has(s));
  const affects = alertAffects(alert, rides.map((r) => r.line), touched);

  if (!affects) {
    return {
      alert,
      affectsRoute: false,
      headline: 'Does not affect your trip',
      detail: `Your route uses ${rides.map((r) => r.line).join(' → ')} and does not pass through the affected stations.`,
    };
  }

  switch (alert.kind) {
    case 'delay': {
      if (hitRide) {
        const backups = backupLines(hitRide);
        const backupText = backups.length
          ? ` The ${backups.join(' and ')} from the same platform ${backups.length > 1 ? 'are' : 'is'} a backup.`
          : ' There is no same-platform backup — allow extra time.';
        return {
          alert,
          affectsRoute: true,
          headline: 'Longer wait on your platform',
          detail: `Your route still works — expect a longer wait on the ${itinerary.firstRide.direction.word} ${linesServing(hitRide.platform, hitRide.fromStation).join('·')} platform.${backupText}`,
        };
      }
      return {
        alert,
        affectsRoute: true,
        headline: 'Delays along your route',
        detail: `Trains are running further apart near ${STATION_BY_ID[hitStation!]?.shortName ?? hitStation}. Allow a few extra minutes.`,
      };
    }
    case 'elevator': {
      const t = transfers.find((x) => alert.stations.includes(x.stationId));
      if (t) {
        return {
          alert,
          affectsRoute: true,
          headline: 'Your transfer is not step-free',
          detail: `Your transfer at ${STATION_BY_ID[t.stationId]?.shortName} uses ${t.sameLevel ? 'a passage' : 'stairs and an escalator'}. Turn on "Elevator-only routes" in Accessibility for a step-free alternative.`,
        };
      }
      return {
        alert,
        affectsRoute: true,
        headline: 'Elevator out at a station on your route',
        detail: `The elevator at ${STATION_BY_ID[hitStation!]?.shortName ?? hitStation} is out. Your route uses stairs there.`,
      };
    }
    case 'entrance': {
      const closedIds = new Set(alert.accessPoints ?? []);
      const usingClosed = closedIds.has(itinerary.entrance.id) || closedIds.has(itinerary.exit.id);
      return {
        alert,
        affectsRoute: true,
        headline: usingClosed ? 'Your entrance is closed' : 'A nearby entrance is closed',
        detail: usingClosed
          ? 'MetroLens has already rerouted you to the next open entrance.'
          : `Use the ${itinerary.entrance.streets} entrance — your route already does.`,
      };
    }
    case 'service': {
      return {
        alert,
        affectsRoute: true,
        headline: 'Changed service on your route',
        detail: `${alert.lines.map((l) => LINE_BY_ID[l]?.name ?? l).join(', ')} is not running normally. Your platform and direction are unchanged, but the ride will take longer.`,
      };
    }
    case 'crowding':
    default: {
      return {
        alert,
        affectsRoute: true,
        headline: 'Crowding on your route',
        detail: `Expect a full platform at ${STATION_BY_ID[hitStation ?? alert.stations[0]]?.shortName ?? 'this station'}. Boarding from the ${itinerary.firstRide.boardCar} of the platform is usually easier.`,
      };
    }
  }
}

export function alertsForItinerary(alerts: ServiceAlert[], itinerary: Itinerary | null): AlertImpact[] {
  return alerts
    .map((a) => impactFor(a, itinerary))
    .sort((a, b) => Number(b.affectsRoute) - Number(a.affectsRoute));
}
