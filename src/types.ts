// Domain types for the MetroLens transit network + navigation engine.

export type LineId =
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'S'
  | 'A' | 'C' | 'E' | 'B' | 'D' | 'F' | 'M'
  | 'N' | 'Q' | 'R' | 'W' | 'L' | 'G';

/** A trunk is a set of lines that share the same pair of platforms at a station. */
export type TrunkId =
  | 'IND8'    // 8th Ave / Central Park West — A C E (B D above 59 St)
  | 'IND6'    // 6th Ave — B D F M
  | 'IND53'   // 53rd St crosstown — E M
  | 'IND63'   // 63rd St — F Q
  | 'INDQB'   // Queens Blvd — E F M R
  | 'INDG'    // Crosstown — G
  | 'IRT7'    // 7th Ave / Broadway — 1 2 3
  | 'IRTLEX'  // Lexington Ave — 4 5 6
  | 'IRTFL'   // Flushing — 7
  | 'IRTSH'   // 42 St Shuttle — S
  | 'BMTB'    // Broadway — N Q R W
  | 'BMTL'    // Canarsie — L
  | 'BMT4'    // 4th Ave (Brooklyn) — D N R
  | 'IRT7BK'; // 7th Ave in Brooklyn — 2 3 4 5

/** dirA travels toward index 0 of the line's stop list; dirB toward the last index. */
export type Dir = 'A' | 'B';

export type Quadrant = 'NE' | 'NW' | 'SE' | 'SW' | 'N' | 'S' | 'E' | 'W';

export type CarPosition = 'front' | 'middle' | 'rear';

export interface AccessPoint {
  id: string;
  /** Human label, e.g. "8 Ave & W 34 St". */
  streets: string;
  quadrant: Quadrant;
  /** Display name used for exits, e.g. "Exit NE". */
  exitName: string;
  lat: number;
  lon: number;
  /** Step-free from street to mezzanine (elevator or ramp). */
  ada: boolean;
  /** If set, this stair only reaches the platform for this direction. */
  onlyDir?: Dir;
  /** If set, only reaches platforms of these trunks. */
  onlyTrunks?: TrunkId[];
  closed?: boolean;
  closedNote?: string;
}

export interface Platform {
  id: string;
  stationId: string;
  trunk: TrunkId;
  lines: LineId[];
  /** Level label shown to riders, e.g. "Lower level". */
  level: string;
  /** Levels below the street: 1 = one flight down. */
  depth: number;
  layout: 'island' | 'side' | 'stacked';
  /** Which way to keep at the corridor split to reach the dirB platform. */
  splitB: 'left' | 'right';
  /** Which side trains arrive on, for the dirB platform. */
  sideB: 'LEFT' | 'RIGHT';
  /** Best car to ride for an onward transfer at this station. */
  xferCar: CarPosition;
  /** Best car to ride to be nearest the exits at this station. */
  exitCar: CarPosition;
}

export interface Station {
  id: string;
  name: string;
  /** Short name for tight UI, e.g. "34 St–Penn Sta". */
  shortName: string;
  lat: number;
  lon: number;
  borough: 'M' | 'Bk' | 'Q' | 'Bx';
  neighborhood: string;
  /** Elevator all the way from street to platform. */
  ada: boolean;
  /** Currently-known elevator outage (also driven by live alerts). */
  elevatorOut: boolean;
  crowd: 'light' | 'moderate' | 'heavy';
  /** Free-transfer complex id — stations sharing one are connected inside fare control. */
  complex?: string;
  platforms: Platform[];
  access: AccessPoint[];
  lines: LineId[];
}

export interface DirectionInfo {
  /** "Downtown", "Uptown", "Brooklyn-bound"… */
  word: string;
  /** "Brooklyn-bound", "Uptown — Washington Heights"… */
  long: string;
  /** Text on the overhead signs at the platform entrance. */
  sign: string;
}

export interface Line {
  id: LineId;
  name: string;
  color: string;
  textColor: string;
  kind: 'EXPRESS' | 'LOCAL';
  /** Ordered stop list. Index 0 is the dirA terminal. */
  stops: string[];
  /** Terminal name when travelling dirA (toward index 0). */
  termA: string;
  termB: string;
  /** Direction descriptors, per direction. */
  dirA: DirectionInfo;
  dirB: DirectionInfo;
  /** Scheduled headway in seconds by service period. */
  headway: { peak: number; day: number; evening: number; night: number };
  cars: number;
}

// ————————————————————————————————— places

export interface Place {
  id: string;
  name: string;
  address: string;
  category: 'landmark' | 'venue' | 'food' | 'park' | 'museum' | 'station' | 'saved';
  lat: number;
  lon: number;
  keywords?: string[];
}

export interface SavedPlace extends Place {
  label: string;
  dot: string;
}

// ————————————————————————————————— alerts

export type AlertKind = 'delay' | 'elevator' | 'entrance' | 'service' | 'crowding';

export interface ServiceAlert {
  id: string;
  kind: AlertKind;
  severity: 'high' | 'medium' | 'low';
  title: string;
  body: string;
  lines: LineId[];
  stations: string[];
  /** Access point ids taken out of service. */
  accessPoints?: string[];
  /** Multiplier applied to scheduled headway for the affected lines. */
  headwayFactor?: number;
  /** Extra seconds added to rides through the affected stations. */
  delaySeconds?: number;
  until: string;
}

// ————————————————————————————————— itinerary

export interface WalkLeg {
  type: 'walk';
  seconds: number;
  meters: number;
  from: string;
  to: string;
  bearing: number;
  instruction: string;
}

export interface RideLeg {
  type: 'ride';
  line: LineId;
  lineName: string;
  kind: 'EXPRESS' | 'LOCAL';
  dir: Dir;
  direction: DirectionInfo;
  trunk: TrunkId;
  /** Terminal shown on the front of the train, e.g. "Far Rockaway–Lefferts Blvd". */
  toward: string;
  fromStation: string;
  toStation: string;
  /** Every station passed through, inclusive of both ends. */
  stops: string[];
  seconds: number;
  platform: Platform;
  /** Lines that share this platform but must NOT be boarded, with why. */
  decoys: { line: LineId; reason: string }[];
  /** Alternative lines on this platform that also work. */
  alternates: { line: LineId; reason: string }[];
  boardCar: CarPosition;
  boardReason: string;
}

export interface TransferLeg {
  type: 'transfer';
  stationId: string;
  fromPlatform: Platform;
  toPlatform: Platform;
  fromLine: LineId;
  toLine: LineId;
  /** Walking time between platforms plus the expected wait for the next train. */
  seconds: number;
  /** Just the walk between platforms, with no waiting. */
  walkSeconds: number;
  sameLevel: boolean;
  stepFree: boolean;
  steps: NavStep[];
}

export type Leg = WalkLeg | RideLeg | TransferLeg;

export interface NavStep {
  id: string;
  title: string;
  detail: string;
  /** Remaining distance to the platform when this step begins. */
  distanceFeet: number;
  level: string;
  /** Arrow rotation in degrees; 0 = straight ahead. */
  rotation: number;
  /** Text on the sign to look for. */
  sign: string;
  /** Arrow glyph shown on the sign. */
  signArrow: string;
  /** Short location label for the station-map view. */
  location: string;
  /** Warning shown when the next move is easy to get wrong. */
  warning: string;
  /** Compass heading the rider should be facing, if known. */
  heading?: number;
  kind: 'enter' | 'fare' | 'corridor' | 'split' | 'vertical' | 'platform' | 'exit';
}

export interface Itinerary {
  id: string;
  profile: RouteProfileId;
  label: string;
  /** Total door-to-door seconds. */
  seconds: number;
  walkSeconds: number;
  transferCount: number;
  legs: Leg[];
  origin: Place;
  destination: Place;
  /** Station the rider enters. */
  entryStation: Station;
  entrance: AccessPoint;
  /** Station the rider leaves from. */
  exitStation: Station;
  exit: AccessPoint;
  /** First ride leg — the one the platform guidance is about. */
  firstRide: RideLeg;
  /** Generated in-station guidance from entrance to the first platform. */
  indoorSteps: NavStep[];
  /** Exit guidance at the destination station. */
  exitSteps: NavStep[];
  stepFree: boolean;
  /** Platform complexity score, 0 (trivial) – 100 (labyrinth). */
  complexity: number;
  warnings: string[];
}

export type RouteProfileId =
  | 'fastest'
  | 'fewest-transfers'
  | 'least-walking'
  | 'accessible'
  | 'simplest-platforms';

export interface RouteProfile {
  id: RouteProfileId;
  label: string;
  walkWeight: number;
  transferPenalty: number;
  complexityPenalty: number;
  requireStepFree: boolean;
}

// ————————————————————————————————— arrivals

export interface Arrival {
  id: string;
  line: LineId;
  lineName: string;
  kind: 'EXPRESS' | 'LOCAL';
  dir: Dir;
  stationId: string;
  trunk: TrunkId;
  /** Seconds until arrival. */
  eta: number;
  toward: string;
  cars: number;
  status: 'on-time' | 'delayed' | 'holding';
}

export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Preferences {
  theme: ThemeChoice;
  avoidStairs: boolean;
  elevatorOnly: boolean;
  fewerTransfers: boolean;
  accessibleEntrances: boolean;
  voice: boolean;
  haptic: boolean;
  largeText: boolean;
  highContrast: boolean;
  autoAdvance: boolean;
  defaultProfile: RouteProfileId;
  walkingTolerance: number;
  maxTransfers: number;
}
