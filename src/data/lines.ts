/** Line definitions: stopping patterns, colors, terminals and headways. */

import type { DirectionInfo, Line, LineId, TrunkId } from '../types';

/**
 * Direction labels are a property of the *platform* (trunk), not the line: the
 * northbound platform at Lex Av/63 St is signed "Uptown & Queens" whether you are
 * waiting for an uptown Q or a Queens-bound F.
 *
 * Every line's `stops` array is ordered so that increasing index always means
 * travelling in the trunk's `dirB` direction at each station along the way.
 */
export const TRUNKS: Record<TrunkId, { name: string; dirA: DirectionInfo; dirB: DirectionInfo }> = {
  IND8: {
    name: '8 Av / Central Park West',
    dirA: { word: 'Uptown', long: 'Uptown — Washington Heights', sign: 'Uptown & The Bronx' },
    dirB: { word: 'Downtown', long: 'Brooklyn-bound', sign: 'Downtown & Brooklyn' },
  },
  IND6: {
    name: '6 Av',
    dirA: { word: 'Uptown', long: 'Uptown — Bronx & Queens', sign: 'Uptown & Queens' },
    dirB: { word: 'Downtown', long: 'Brooklyn-bound', sign: 'Downtown & Brooklyn' },
  },
  IND53: {
    name: '53 St crosstown',
    dirA: { word: 'Queens', long: 'Queens-bound — Forest Hills', sign: 'Queens' },
    dirB: { word: 'Downtown', long: 'Downtown & Brooklyn', sign: 'Downtown & Brooklyn' },
  },
  IND63: {
    name: '63 St',
    dirA: { word: 'Uptown', long: 'Uptown & Queens', sign: 'Uptown & Queens' },
    dirB: { word: 'Downtown', long: 'Downtown & Brooklyn', sign: 'Downtown & Brooklyn' },
  },
  INDQB: {
    name: 'Queens Blvd',
    dirA: { word: 'Queens', long: 'Queens-bound — Forest Hills', sign: 'Queens' },
    dirB: { word: 'Manhattan', long: 'Manhattan-bound', sign: 'Manhattan' },
  },
  INDG: {
    name: 'Crosstown',
    dirA: { word: 'Queens', long: 'Court Sq-bound', sign: 'Queens — Court Sq' },
    dirB: { word: 'Brooklyn', long: 'Church Av-bound', sign: 'Brooklyn — Church Av' },
  },
  IRT7: {
    name: '7 Av / Broadway',
    dirA: { word: 'Uptown', long: 'Uptown — The Bronx', sign: 'Uptown & The Bronx' },
    dirB: { word: 'Downtown', long: 'Downtown & Brooklyn', sign: 'Downtown & Brooklyn' },
  },
  IRTLEX: {
    name: 'Lexington Av',
    dirA: { word: 'Uptown', long: 'Uptown — The Bronx', sign: 'Uptown & The Bronx' },
    dirB: { word: 'Downtown', long: 'Downtown & Brooklyn', sign: 'Downtown & Brooklyn' },
  },
  IRTFL: {
    name: 'Flushing',
    dirA: { word: 'Manhattan', long: 'Manhattan-bound — Hudson Yards', sign: 'Manhattan' },
    dirB: { word: 'Queens', long: 'Flushing-bound', sign: 'Queens — Flushing' },
  },
  IRTSH: {
    name: '42 St Shuttle',
    dirA: { word: 'Times Sq', long: 'Times Sq-bound', sign: 'Times Sq' },
    dirB: { word: 'Grand Central', long: 'Grand Central-bound', sign: 'Grand Central' },
  },
  BMTB: {
    name: 'Broadway',
    dirA: { word: 'Uptown', long: 'Uptown & Queens', sign: 'Uptown & Queens' },
    dirB: { word: 'Downtown', long: 'Downtown & Brooklyn', sign: 'Downtown & Brooklyn' },
  },
  BMTL: {
    name: 'Canarsie',
    dirA: { word: 'Manhattan', long: '8 Av-bound', sign: '8 Av & Manhattan' },
    dirB: { word: 'Brooklyn', long: 'Canarsie-bound', sign: 'Brooklyn — Canarsie' },
  },
  BMT4: {
    name: '4 Av',
    dirA: { word: 'Manhattan', long: 'Manhattan-bound', sign: 'Manhattan' },
    dirB: { word: 'Brooklyn', long: 'Bay Ridge-bound', sign: 'Brooklyn — Bay Ridge' },
  },
  IRT7BK: {
    name: '7 Av (Brooklyn)',
    dirA: { word: 'Manhattan', long: 'Manhattan-bound', sign: 'Manhattan' },
    dirB: { word: 'Brooklyn', long: 'Brooklyn-bound — Flatbush', sign: 'Brooklyn' },
  },
};

const BLUE = '#0039A6';
const ORANGE = '#FF6319';
const RED = '#EE352E';
const GREEN = '#00933C';
const YELLOW = '#FCCC0A';
const PURPLE = '#B933AD';
const LIME = '#6CBE45';
const GREY = '#A7A9AC';
const DARK = '#808183';

type Row = {
  id: LineId;
  name: string;
  color: string;
  text?: string;
  kind: Line['kind'];
  termA: string;
  termB: string;
  hw: [number, number, number, number];
  cars?: number;
  stops: string[];
};

const ROWS: Row[] = [
  {
    id: '1', name: '1 Local', color: RED, kind: 'LOCAL',
    termA: 'Van Cortlandt Park–242 St', termB: 'South Ferry', hw: [270, 360, 480, 1200],
    stops: ['bway-145', 'bway-137', 'bway-125', 'bway-116', 'bway-110', 'bway-103', 'bway-96', 'bway-86',
      'bway-79', 'bway-72', 'bway-66', 'columbus-59', 'bway-50', 'times-sq', 'penn-7av', 'bway-28',
      'bway-23', 'bway-18', '14-7av', 'christopher', 'houston-1', 'canal-1', 'franklin', 'chambers-1',
      'wtc-cortlandt', 'rector-1', 'south-ferry'],
  },
  {
    id: '2', name: '2 Express', color: RED, kind: 'EXPRESS',
    termA: 'Wakefield–241 St', termB: 'Flatbush Av–Brooklyn College', hw: [300, 420, 540, 1200],
    stops: ['3av-149', '149-gc', 'lenox-135', 'lenox-125', 'lenox-116', 'cpn-110', 'bway-96', 'bway-72',
      'times-sq', 'penn-7av', '14-7av', 'chambers-1', 'park-pl', 'fulton', 'wall-st', 'clark-st',
      'borough-hall', 'hoyt-st', 'nevins', 'atlantic', 'grand-army-2', 'eastern-pkwy', 'franklin-av-23'],
  },
  {
    id: '3', name: '3 Express', color: RED, kind: 'EXPRESS',
    termA: 'Harlem–148 St', termB: 'New Lots Av', hw: [330, 450, 600, 0],
    stops: ['lenox-135', 'lenox-125', 'lenox-116', 'cpn-110', 'bway-96', 'bway-72', 'times-sq', 'penn-7av',
      '14-7av', 'chambers-1', 'park-pl', 'fulton', 'wall-st', 'clark-st', 'borough-hall', 'hoyt-st',
      'nevins', 'atlantic', 'grand-army-2', 'eastern-pkwy', 'franklin-av-23'],
  },
  {
    id: '4', name: '4 Express', color: GREEN, kind: 'EXPRESS',
    termA: 'Woodlawn', termB: 'Crown Hts–Utica Av', hw: [270, 420, 540, 1200],
    stops: ['161-yankee', '149-gc', '138-gc', 'lex-125', 'lex-86', 'lex-59', 'gct-42', 'union-14', 'bk-bridge', 'fulton',
      'wall-45', 'bowling-green', 'borough-hall', 'nevins', 'atlantic'],
  },
  {
    id: '5', name: '5 Express', color: GREEN, kind: 'EXPRESS',
    termA: 'Eastchester–Dyre Av', termB: 'Flatbush Av–Brooklyn College', hw: [360, 480, 600, 0],
    stops: ['3av-149', '149-gc', 'lex-125', 'lex-86', 'lex-59', 'gct-42', 'union-14', 'bk-bridge', 'fulton',
      'wall-45', 'bowling-green', 'borough-hall', 'nevins', 'atlantic'],
  },
  {
    id: '6', name: '6 Local', color: GREEN, kind: 'LOCAL',
    termA: 'Pelham Bay Park', termB: 'Brooklyn Bridge–City Hall', hw: [240, 330, 450, 1080],
    stops: ['lex-125', 'lex-116', 'lex-110', 'lex-103', 'lex-96', 'lex-86', 'lex-77', 'lex-68', 'lex-59',
      '51-lex', 'gct-42', 'lex-33', 'lex-28', 'lex-23', 'union-14', 'astor', 'bway-laf', 'spring-lex',
      'canal-lex', 'bk-bridge'],
  },
  {
    id: '7', name: '7 Local', color: PURPLE, kind: 'LOCAL',
    termA: '34 St–Hudson Yards', termB: 'Flushing–Main St', hw: [240, 330, 420, 1080], cars: 11,
    stops: ['hudson-yards', 'times-sq', '5av-7', 'gct-42', 'vernon', 'hunters-pt', 'court-sq',
      'queensboro-plaza', '33-rawson', '40-lowery', '46-bliss', '52-lincoln', '61-woodside', '69-st',
      'roosevelt'],
  },
  {
    id: 'S', name: '42 St Shuttle', color: DARK, kind: 'LOCAL',
    termA: 'Times Sq–42 St', termB: 'Grand Central–42 St', hw: [180, 300, 360, 0], cars: 6,
    stops: ['times-sq', 'gct-42'],
  },
  {
    id: 'A', name: 'A Express', color: BLUE, kind: 'EXPRESS',
    termA: 'Inwood–207 St', termB: 'Far Rockaway–Lefferts Blvd', hw: [300, 480, 600, 1200],
    stops: ['8av-145', '8av-125', 'columbus-59', 'pabt-42', 'penn-8av', '8av-14', 'w4', 'canal-8av',
      'chambers-8av', 'fulton', 'high-st', 'jay-st', 'hoyt-scherm'],
  },
  {
    id: 'C', name: 'C Local', color: BLUE, kind: 'LOCAL',
    termA: '168 St–Washington Hts', termB: 'Euclid Av', hw: [480, 600, 720, 0],
    stops: ['8av-145', '8av-135', '8av-125', '8av-116', '8av-110', '8av-103', '8av-96', '8av-86', '8av-81',
      '8av-72', 'columbus-59', '8av-50', 'pabt-42', 'penn-8av', '8av-23', '8av-14', 'w4', 'spring-8av',
      'canal-8av', 'chambers-8av', 'fulton', 'high-st', 'jay-st', 'hoyt-scherm'],
  },
  {
    id: 'E', name: 'E', color: BLUE, kind: 'EXPRESS',
    termA: 'Jamaica Center–Parsons/Archer', termB: 'World Trade Center', hw: [270, 420, 540, 1080],
    stops: ['roosevelt', 'queens-plaza', 'court-sq', 'lex-53', '5av-53', '7av-53', '8av-50', 'pabt-42',
      'penn-8av', '8av-23', '8av-14', 'w4', 'spring-8av', 'canal-8av', 'wtc-e'],
  },
  {
    id: 'B', name: 'B', color: ORANGE, kind: 'LOCAL',
    termA: 'Bedford Park Blvd', termB: 'Brighton Beach', hw: [420, 540, 0, 0],
    stops: ['8av-145', '8av-135', '8av-125', '8av-116', '8av-110', '8av-103', '8av-96', '8av-86', '8av-81',
      '8av-72', 'columbus-59', '7av-53', 'rock-4750', 'bryant-42', 'herald-34', 'w4', 'bway-laf',
      'grand-st', 'dekalb', 'atlantic'],
  },
  {
    id: 'D', name: 'D Express', color: ORANGE, kind: 'EXPRESS',
    termA: 'Norwood–205 St', termB: 'Coney Island–Stillwell Av', hw: [360, 480, 600, 1200],
    stops: ['8av-145', '8av-125', 'columbus-59', '7av-53', 'rock-4750', 'bryant-42', 'herald-34', 'w4',
      'bway-laf', 'grand-st', 'atlantic', '36-st-bk'],
  },
  {
    id: 'F', name: 'F Local', color: ORANGE, kind: 'LOCAL',
    termA: 'Jamaica–179 St', termB: 'Coney Island–Stillwell Av', hw: [270, 400, 540, 1200],
    stops: ['roosevelt', '21-queensbridge', 'lex-63', '57-6av', 'rock-4750', 'bryant-42', 'herald-34',
      '23-6av', '14-6av', 'w4', 'bway-laf', '2av', 'essex', 'east-bway', 'york-st', 'jay-st', 'bergen',
      'carroll', 'smith-9', '4av-9st', '7av-bk', '15-prospect', 'church-f'],
  },
  {
    id: 'M', name: 'M Local', color: ORANGE, kind: 'LOCAL',
    termA: 'Forest Hills–71 Av', termB: 'Middle Village–Metropolitan Av', hw: [420, 540, 660, 0],
    stops: ['roosevelt', '65-st', 'northern', 'steinway', '36-st-q', 'queens-plaza', 'court-sq', 'lex-53',
      '5av-53', 'rock-4750', 'bryant-42', 'herald-34', '23-6av', '14-6av', 'w4', 'bway-laf'],
  },
  {
    id: 'N', name: 'N Express', color: YELLOW, text: '#101318', kind: 'EXPRESS',
    termA: 'Astoria–Ditmars Blvd', termB: 'Coney Island–Stillwell Av', hw: [300, 420, 540, 1200],
    stops: ['ditmars', 'astoria-blvd', '30-av', 'bway-astoria', '39-av', 'queensboro-plaza', 'lex-59',
      '57-7av', 'times-sq', 'herald-34', 'union-14', 'canal-lex', 'atlantic', '36-st-bk'],
  },
  {
    id: 'Q', name: 'Q Express', color: YELLOW, text: '#101318', kind: 'EXPRESS',
    termA: '96 St–2 Av', termB: 'Coney Island–Stillwell Av', hw: [270, 390, 510, 1200],
    stops: ['96-2av', '86-2av', '72-2av', 'lex-63', '57-7av', 'times-sq', 'herald-34', 'union-14',
      'canal-lex', 'dekalb', 'atlantic'],
  },
  {
    id: 'R', name: 'R Local', color: YELLOW, text: '#101318', kind: 'LOCAL',
    termA: 'Forest Hills–71 Av', termB: 'Bay Ridge–95 St', hw: [360, 480, 600, 1200],
    stops: ['roosevelt', '65-st', 'northern', 'steinway', '36-st-q', 'queens-plaza', 'lex-59', '57-7av',
      '49-st', 'times-sq', 'herald-34', '28-bway', '23-bway', 'union-14', '8-st', 'prince', 'canal-lex',
      'city-hall-bway', 'cortlandt-bway', 'rector-bway', 'whitehall', 'borough-hall', 'jay-st', 'dekalb',
      'atlantic', 'union-st', '4av-9st', 'prospect-av', '25-st', '36-st-bk'],
  },
  {
    id: 'W', name: 'W Local', color: YELLOW, text: '#101318', kind: 'LOCAL',
    termA: 'Astoria–Ditmars Blvd', termB: 'Whitehall St–South Ferry', hw: [420, 600, 0, 0],
    stops: ['ditmars', 'astoria-blvd', '30-av', 'bway-astoria', '39-av', 'queensboro-plaza', 'lex-59',
      '57-7av', '49-st', 'times-sq', 'herald-34', '28-bway', '23-bway', 'union-14', '8-st', 'prince',
      'canal-lex', 'city-hall-bway', 'cortlandt-bway', 'rector-bway', 'whitehall'],
  },
  {
    id: 'L', name: 'L', color: GREY, kind: 'LOCAL',
    termA: '8 Av', termB: 'Canarsie–Rockaway Pkwy', hw: [180, 300, 420, 900], cars: 8,
    stops: ['8av-14', '6av-l', 'union-14', '3av-l', '1av-l', 'bedford', 'lorimer', 'graham'],
  },
  {
    id: 'G', name: 'G Local', color: LIME, kind: 'LOCAL',
    termA: 'Court Sq', termB: 'Church Av', hw: [420, 540, 660, 1200], cars: 5,
    stops: ['court-sq', '21-st-g', 'greenpoint', 'nassau-g', 'metropolitan-g', 'bway-g', 'hoyt-scherm',
      'bergen', 'carroll', 'smith-9', '4av-9st', '7av-bk', '15-prospect', 'church-f'],
  },
];

export const LINES: Line[] = ROWS.map((r) => ({
  id: r.id,
  name: r.name,
  color: r.color,
  textColor: r.text ?? '#FFFFFF',
  kind: r.kind,
  stops: r.stops,
  termA: r.termA,
  termB: r.termB,
  // Direction info is resolved per platform at query time; these are fallbacks.
  dirA: { word: 'Uptown', long: r.termA, sign: 'Uptown' },
  dirB: { word: 'Downtown', long: r.termB, sign: 'Downtown' },
  headway: { peak: r.hw[0], day: r.hw[1], evening: r.hw[2] || r.hw[1], night: r.hw[3] || r.hw[2] || r.hw[1] },
  cars: r.cars ?? 8,
}));

export const LINE_BY_ID: Record<string, Line> = Object.fromEntries(LINES.map((l) => [l.id, l]));

export const LINE_ORDER: LineId[] = LINES.map((l) => l.id);
