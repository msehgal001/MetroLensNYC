/** Service alerts. These feed both the Alerts screen and the route planner. */

import type { ServiceAlert } from '../types';

export const ALERTS: ServiceAlert[] = [
  {
    id: 'a-canal-signals',
    kind: 'delay',
    severity: 'high',
    title: 'Delays — signal problems at Canal St',
    body: 'Downtown A trains are running 10–12 minutes apart while crews work on a signal at Canal St.',
    lines: ['A'],
    stations: ['canal-8av', 'chambers-8av', 'fulton'],
    headwayFactor: 1.7,
    delaySeconds: 90,
    until: 'Through this evening',
  },
  {
    id: 'a-w4-elevator',
    kind: 'elevator',
    severity: 'medium',
    title: 'Elevator outage — W 4 St–Wash Sq',
    body: 'The elevator between the mezzanine and the lower level is out of service.',
    lines: ['A', 'C', 'E', 'B', 'D', 'F', 'M'],
    stations: ['w4'],
    until: 'Aug 14',
  },
  {
    id: 'a-penn-entrance',
    kind: 'entrance',
    severity: 'low',
    title: 'Entrance closed — 7 Ave & W 32nd St',
    body: 'The 7 Ave & W 32 St stair at 34 St–Penn Station is closed for repairs.',
    lines: ['1', '2', '3'],
    stations: ['penn-7av'],
    accessPoints: ['penn-7av:SW:1'],
    until: 'Through Aug 12',
  },
  {
    id: 'a-r-weekend',
    kind: 'service',
    severity: 'medium',
    title: 'R runs local via Whitehall St this weekend',
    body: 'R trains run along the local track in both directions between Canal St and Whitehall St.',
    lines: ['R'],
    stations: ['canal-lex', 'city-hall-bway', 'cortlandt-bway', 'rector-bway', 'whitehall'],
    delaySeconds: 120,
    until: 'Sat–Sun',
  },
  {
    id: 'a-l-crowding',
    kind: 'crowding',
    severity: 'low',
    title: 'Heavy crowding — Bedford Av',
    body: 'Manhattan-bound L platforms at Bedford Av are unusually crowded.',
    lines: ['L'],
    stations: ['bedford'],
    delaySeconds: 60,
    until: 'Until 8 PM',
  },
];

export const ALERT_BY_ID: Record<string, ServiceAlert> = Object.fromEntries(
  ALERTS.map((a) => [a.id, a]),
);
