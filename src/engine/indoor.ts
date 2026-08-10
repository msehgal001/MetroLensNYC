/**
 * Generates in-station guidance: entrance → platform, platform → platform (transfers),
 * and platform → street (exits).
 *
 * Steps are derived from the station's platform record (depth, layout, which way the
 * corridor splits, which side the platform edge is on) so that the same station always
 * produces the same directions, and a deeper or more complex station produces more of them.
 */

import type { AccessPoint, Dir, NavStep, Platform, Preferences, Station } from '../types';
import { bearingTo, directionInfo, hash, linesServing, platformSide, splitSide } from './shared';

const ARROW_STRAIGHT = '→';
const ARROW_DOWN = '↓';
const ARROW_UP = '↑';
const ARROW_DOWN_RIGHT = '↘';
const ARROW_DOWN_LEFT = '↙';

function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function linesLabel(platform: Platform, stationId: string): string {
  return linesServing(platform, stationId).join('·');
}

function oppositeDir(dir: Dir): Dir {
  return dir === 'A' ? 'B' : 'A';
}

function verticalVerb(prefs: Preferences, station: Station, down: boolean): {
  verb: string;
  mode: 'stairs' | 'escalator' | 'elevator';
} {
  const stepFree = prefs.elevatorOnly || prefs.avoidStairs;
  if (stepFree && station.ada && !station.elevatorOut) {
    return { verb: down ? 'Take the elevator down' : 'Take the elevator up', mode: 'elevator' };
  }
  if (prefs.avoidStairs) {
    return { verb: down ? 'Take the escalator down' : 'Take the escalator up', mode: 'escalator' };
  }
  return { verb: down ? 'Use the stairs down' : 'Use the stairs up', mode: 'stairs' };
}

interface StepDraft {
  title: string;
  detail: string;
  level: string;
  rotation: number;
  sign: string;
  signArrow: string;
  location: string;
  warning?: string;
  kind: NavStep['kind'];
}

/** Turns drafts into NavSteps with a distance countdown and running compass headings. */
function finalize(drafts: StepDraft[], totalFeet: number, startHeading: number, idPrefix: string): NavStep[] {
  const n = drafts.length;
  let heading = startHeading;
  return drafts.map((d, i) => {
    if (i > 0) heading = norm(heading + drafts[i - 1].rotation);
    const remaining = Math.round((totalFeet * (n - i)) / n / 10) * 10;
    return {
      id: `${idPrefix}-${i}`,
      title: d.title,
      detail: d.detail,
      distanceFeet: Math.max(30, remaining),
      level: d.level,
      rotation: d.rotation,
      sign: d.sign,
      signArrow: d.signArrow,
      location: d.location,
      warning: d.warning ?? '',
      heading,
      kind: d.kind,
    };
  });
}

/** Guidance from a street entrance down to the platform for `dir`. */
export function entryRoute(
  station: Station,
  access: AccessPoint,
  platform: Platform,
  dir: Dir,
  prefs: Preferences,
): NavStep[] {
  const info = directionInfo(platform, dir);
  const opp = directionInfo(platform, oppositeDir(dir));
  const label = linesLabel(platform, station.id);
  const keep = splitSide(platform, dir);
  const other = keep === 'left' ? 'right' : 'left';
  const KEEP = keep.toUpperCase();
  const side = platformSide(platform, dir);
  const { verb, mode } = verticalVerb(prefs, station, true);
  const altVertical =
    mode === 'elevator'
      ? 'Stairs are just past it if you prefer.'
      : station.ada && !station.elevatorOut
        ? 'Elevator: about 30 ft further on, signposted.'
        : 'There is no elevator at this station.';

  const drafts: StepDraft[] = [
    {
      title: 'Enter the station',
      detail: `${access.ada ? 'Take the elevator or stairs down' : 'Take the stairs down'} at the ${access.streets} entrance.`,
      level: 'Street level',
      rotation: 0,
      sign: station.shortName,
      signArrow: '',
      location: `Entrance — ${access.streets}`,
      kind: 'enter',
    },
    {
      title: 'Pass through the turnstiles',
      detail: 'Tap OMNY or swipe your MetroCard at the fare gates ahead.',
      level: platform.depth > 1 ? 'Upper mezzanine' : 'Mezzanine',
      rotation: 0,
      sign: 'Fare gates ahead',
      signArrow: '',
      location: 'Fare gates',
      kind: 'fare',
    },
    {
      title: `Follow signs for ${info.word} ${label}`,
      detail: `Walk straight along the main corridor — ignore ${opp.sign} signs.`,
      level: platform.depth > 1 ? 'Upper mezzanine' : 'Mezzanine',
      rotation: 0,
      sign: info.sign,
      signArrow: ARROW_STRAIGHT,
      location: 'Main corridor',
      kind: 'corridor',
    },
  ];

  const hasSplit = station.platforms.length > 1 || platform.depth > 1 || platform.layout !== 'island';
  if (hasSplit) {
    drafts.push({
      title: `Keep ${KEEP} at the corridor split`,
      detail: `The ${other} corridor leads to the ${opp.word} platform — not yours.`,
      level: platform.depth > 1 ? 'Upper mezzanine' : 'Mezzanine',
      rotation: keep === 'left' ? -55 : 55,
      sign: `${info.word} — keep ${keep}`,
      signArrow: keep === 'left' ? ARROW_DOWN_LEFT : ARROW_DOWN_RIGHT,
      location: 'Corridor split',
      warning: `${other[0].toUpperCase()}${other.slice(1)} corridor leads ${opp.word} — stay ${keep}`,
      kind: 'split',
    });
  }

  if (station.complex || station.platforms.length > 2) {
    drafts.push({
      title: 'Cross the mezzanine',
      detail: `Keep the ${info.word.toLowerCase()} signs on your ${keep}. Do not follow the transfer passage.`,
      level: 'Mezzanine',
      rotation: 0,
      sign: `${info.word} ${label}`,
      signArrow: ARROW_STRAIGHT,
      location: 'Mezzanine crossing',
      kind: 'corridor',
    });
  }

  if (platform.depth >= 1) {
    const flights = Math.max(1, platform.depth - 1) || 1;
    drafts.push({
      title: platform.depth > 2 ? `Go down ${flights} more levels` : 'Go down one level',
      detail: `${verb} on your ${keep}. ${altVertical}`,
      level: platform.depth > 2 ? 'Lower mezzanine' : 'Lower level',
      rotation: 180,
      sign: `${info.word} platform`,
      signArrow: ARROW_DOWN,
      location: mode === 'elevator' ? 'Elevator down' : mode === 'escalator' ? 'Escalator down' : 'Stairs down',
      kind: 'vertical',
    });
  }

  drafts.push({
    title: `Walk ahead — ${info.word} platform`,
    detail: `Stay to the ${side === 'LEFT' ? 'left' : 'right'}. Trains arrive on the ${side} side.`,
    level: platform.level,
    rotation: 0,
    sign: `${info.word} ${label} platform`,
    signArrow: ARROW_STRAIGHT,
    location: 'Platform',
    kind: 'platform',
  });

  const totalFeet = 240 + platform.depth * 95 + drafts.length * 35 + (hash(station.id) % 60);
  const startHeading = bearingTo(access.lat, access.lon, station.lat, station.lon);
  return finalize(drafts, totalFeet, startHeading, `entry-${station.id}-${platform.trunk}-${dir}`);
}

/** Guidance for an in-system transfer between two platforms. */
export function transferRoute(
  station: Station,
  from: Platform,
  to: Platform,
  dir: Dir,
  prefs: Preferences,
): NavStep[] {
  const info = directionInfo(to, dir);
  const label = linesLabel(to, to.stationId);
  const goingDown = to.depth > from.depth;
  const levels = Math.abs(to.depth - from.depth);
  const { verb, mode } = verticalVerb(prefs, station, goingDown);
  const side = platformSide(to, dir);
  const crossStation = from.stationId !== to.stationId;

  const drafts: StepDraft[] = [
    {
      title: `Leave by the ${from.xferCar} doors`,
      detail: `You are already riding in the ${from.xferCar} of the train — the doors open closest to the transfer passage.`,
      level: from.level,
      rotation: 0,
      sign: `Transfer — ${label}`,
      signArrow: ARROW_STRAIGHT,
      location: 'Platform',
      kind: 'platform',
    },
    {
      title: `Follow signs for ${info.word} ${label}`,
      detail: crossStation
        ? `Take the connecting passage toward ${station.shortName}.`
        : 'The transfer passage is signposted from the platform.',
      level: from.level,
      rotation: 0,
      sign: `${info.word} ${label}`,
      signArrow: ARROW_STRAIGHT,
      location: 'Transfer passage',
      kind: 'corridor',
    },
    {
      title: 'Stay inside fare control',
      detail: 'Do not go through the turnstiles — this transfer is free and stays inside the station.',
      level: from.level,
      rotation: 0,
      sign: 'No exit — transfer',
      signArrow: '',
      location: 'Fare control',
      warning: 'Going through the turnstiles here costs a second fare',
      kind: 'fare',
    },
  ];

  if (levels > 0) {
    drafts.push({
      title: goingDown ? `Go down ${levels} level${levels > 1 ? 's' : ''}` : `Go up ${levels} level${levels > 1 ? 's' : ''}`,
      detail:
        mode === 'elevator'
          ? `${verb} — it is signposted from the passage.`
          : `${verb}, then continue straight.`,
      level: to.level,
      rotation: goingDown ? 180 : 0,
      sign: `${info.word} platform`,
      signArrow: goingDown ? ARROW_DOWN : ARROW_UP,
      location: mode === 'elevator' ? 'Elevator' : mode === 'escalator' ? 'Escalator' : 'Stairs',
      kind: 'vertical',
    });
  }

  drafts.push({
    title: `Your platform is on the ${side}`,
    detail: `Overhead signs read "${info.sign}". Trains arrive on the ${to.sideB} side.`,
    level: to.level,
    rotation: side === 'LEFT' ? -35 : 35,
    sign: `${info.word} ${label}`,
    signArrow: side === 'LEFT' ? ARROW_DOWN_LEFT : ARROW_DOWN_RIGHT,
    location: 'Platform',
    kind: 'platform',
  });

  const totalFeet = 180 + levels * 110 + (crossStation ? 260 : 0) + (hash(station.id + to.trunk) % 50);
  return finalize(drafts, totalFeet, 0, `xfer-${station.id}-${to.trunk}-${dir}`);
}

/** Guidance from the arriving platform out to the street. */
export function exitRoute(
  station: Station,
  platform: Platform,
  access: AccessPoint,
  prefs: Preferences,
): NavStep[] {
  const { verb, mode } = verticalVerb(prefs, station, false);
  const flights = Math.max(1, platform.depth);
  const drafts: StepDraft[] = [
    {
      title: `Leave from the ${platform.exitCar} of the train`,
      detail: `The ${platform.exitCar} doors open closest to the ${access.exitName} stairs.`,
      level: platform.level,
      rotation: 0,
      sign: access.exitName,
      signArrow: ARROW_STRAIGHT,
      location: 'Platform',
      kind: 'platform',
    },
    {
      title: `Follow the \u201c${access.exitName}\u201d signs`,
      detail: `Green exit signs point toward ${access.streets}. Ignore the transfer signs.`,
      level: platform.depth > 1 ? 'Mezzanine' : platform.level,
      rotation: 0,
      sign: `${access.exitName} — ${access.streets}`,
      signArrow: ARROW_UP,
      location: 'Exit corridor',
      kind: 'corridor',
    },
    {
      title: `Go up ${flights} flight${flights > 1 ? 's' : ''}`,
      detail:
        mode === 'elevator'
          ? `${verb} to the street.`
          : `${verb}. ${station.ada && !station.elevatorOut ? 'An elevator to the street is signposted nearby.' : ''}`.trim(),
      level: 'Street level',
      rotation: 0,
      sign: access.exitName,
      signArrow: ARROW_UP,
      location: mode === 'elevator' ? 'Elevator up' : 'Stairs up',
      kind: 'vertical',
    },
    {
      title: `Come out at ${access.streets}`,
      detail: `You will surface on the ${access.quadrant} corner.`,
      level: 'Street level',
      rotation: 0,
      sign: access.streets,
      signArrow: '',
      location: access.exitName,
      kind: 'exit',
    },
  ];
  void prefs;
  const totalFeet = 160 + platform.depth * 80;
  return finalize(drafts, totalFeet, 0, `exit-${station.id}-${platform.trunk}`);
}

/** Recovery guidance after the rider realises they took a wrong turn. */
export function turnAroundSteps(
  station: Station,
  platform: Platform,
  dir: Dir,
  wrongPlatform: boolean,
): { title: string; detail: string }[] {
  const info = directionInfo(platform, dir);
  const opp = directionInfo(platform, oppositeDir(dir));
  const label = linesLabel(platform, station.id);
  if (wrongPlatform) {
    return [
      { title: 'Go back up the stairs behind you', detail: `You are on the ${opp.word} platform.` },
      { title: 'Cross the mezzanine', detail: 'Stay inside fare control — do not exit.' },
      { title: `Follow signs for ${info.word} ${label}`, detail: `Signs read \u201c${info.sign}\u201d.` },
    ];
  }
  return [
    { title: 'Turn around', detail: 'Walk back about 60 ft to the last junction.' },
    { title: `Follow signs for ${info.word} ${label}`, detail: `Signs read \u201c${info.sign}\u201d.` },
    {
      title: `Keep ${splitSide(platform, dir).toUpperCase()} at the split`,
      detail: `The other corridor goes to the ${opp.word} side.`,
    },
  ];
}
