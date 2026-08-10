/**
 * MetroLens station dataset — a curated NYC core network.
 *
 * Station names, positions, line assignments and stopping patterns follow the real
 * system closely enough to plan believable trips. In-station geometry (which corridor
 * to keep to, which side the platform edge is on, best boarding car) is *illustrative*:
 * where it is not authored below it is derived deterministically from the station id so
 * that guidance is stable and self-consistent, not random. See DATASET_NOTE.
 */

import type { AccessPoint, CarPosition, Platform, Quadrant, Station, TrunkId } from '../types';

export const DATASET_NOTE =
  'Stations, lines and stopping patterns mirror the real NYC network, and elevator (ADA) ' +
  'status comes from the official MTA station dataset when reachable. Entrance corners, ' +
  'corridor layouts and platform sides are illustrative rather than surveyed.';

interface Row {
  i: string;
  n: string;
  s?: string;
  la: number;
  lo: number;
  b: Station['borough'];
  h: string;
  ada?: 1;
  cr?: Station['crowd'];
  cx?: string;
  /** `trunk|lines|level|depth|layout[|splitB|sideB|xferCar|exitCar]` */
  p: string[];
  /** `quad|streets[|flag,flag]`  flags: ada, dirA, dirB, closed:<note> */
  a: string[];
}

// —————————————————————————————————————————————————————————————— rows

const ROWS: Row[] = [
  // ——— IND 8 Ave / Central Park West ———
  { i: '8av-145', n: '145 St', la: 40.8172, lo: -73.944, b: 'M', h: 'Harlem', cr: 'light',
    p: ['IND8|A,C,B,D|Mezzanine|2|island'],
    a: ['NE|St Nicholas Ave & W 145 St', 'SW|St Nicholas Ave & W 145 St'] },
  { i: '8av-135', n: '135 St', la: 40.8178, lo: -73.9476, b: 'M', h: 'Harlem', cr: 'light',
    p: ['IND8|B,C|Platform level|1|island'],
    a: ['NE|St Nicholas Ave & W 135 St', 'SW|St Nicholas Ave & W 135 St'] },
  { i: '8av-125', n: '125 St', la: 40.8112, lo: -73.9524, b: 'M', h: 'Harlem', ada: 1, cr: 'moderate',
    p: ['IND8|A,C,B,D|Platform level|2|island'],
    a: ['NE|St Nicholas Ave & W 125 St|ada', 'SW|St Nicholas Ave & W 125 St', 'NW|Frederick Douglass Blvd & W 125 St'] },
  { i: '8av-116', n: '116 St', la: 40.8054, lo: -73.9546, b: 'M', h: 'Morningside', cr: 'light',
    p: ['IND8|B,C|Platform level|1|island'], a: ['NE|Frederick Douglass Blvd & W 116 St', 'SW|Frederick Douglass Blvd & W 116 St'] },
  { i: '8av-110', n: 'Cathedral Pkwy–110 St', s: 'Cathedral Pkwy', la: 40.8005, lo: -73.9581, b: 'M', h: 'Morningside', cr: 'light',
    p: ['IND8|B,C|Platform level|1|island'], a: ['NE|Frederick Douglass Blvd & W 110 St', 'SW|Frederick Douglass Blvd & W 110 St'] },
  { i: '8av-103', n: '103 St', la: 40.7962, lo: -73.9613, b: 'M', h: 'Upper West Side', cr: 'light',
    p: ['IND8|B,C|Platform level|1|island'], a: ['NE|Central Park West & W 103 St', 'SW|Central Park West & W 103 St'] },
  { i: '8av-96', n: '96 St', la: 40.7915, lo: -73.9647, b: 'M', h: 'Upper West Side', cr: 'moderate',
    p: ['IND8|B,C|Platform level|1|island'], a: ['NE|Central Park West & W 96 St', 'SW|Central Park West & W 96 St'] },
  { i: '8av-86', n: '86 St', la: 40.7856, lo: -73.9686, b: 'M', h: 'Upper West Side', cr: 'moderate',
    p: ['IND8|B,C|Platform level|1|island'], a: ['NE|Central Park West & W 86 St', 'SW|Central Park West & W 86 St'] },
  { i: '8av-81', n: '81 St–Museum of Natural History', s: '81 St–Museum', la: 40.7814, lo: -73.972, b: 'M', h: 'Upper West Side', ada: 1, cr: 'moderate',
    p: ['IND8|B,C|Platform level|1|island'], a: ['NE|Central Park West & W 81 St|ada', 'SW|Central Park West & W 79 St'] },
  { i: '8av-72', n: '72 St', la: 40.7759, lo: -73.9762, b: 'M', h: 'Upper West Side', ada: 1, cr: 'moderate',
    p: ['IND8|B,C|Platform level|1|island'], a: ['NE|Central Park West & W 72 St|ada', 'SW|Central Park West & W 72 St'] },
  { i: 'columbus-59', n: '59 St–Columbus Circle', s: 'Columbus Circle', la: 40.7681, lo: -73.9819, b: 'M', h: 'Midtown West', ada: 1, cr: 'heavy',
    p: ['IND8|A,C,B,D|Lower level|2|island|right|RIGHT|rear|middle', 'IRT7|1|Upper level|1|side|left|LEFT|front|middle'],
    a: ['NE|Broadway & W 60 St|ada', 'SW|Columbus Circle & W 58 St', 'SE|Central Park West & W 59 St'] },
  { i: '8av-50', n: '50 St', la: 40.7621, lo: -73.9858, b: 'M', h: 'Midtown West', cr: 'moderate',
    p: ['IND8|C,E|Platform level|1|side'], a: ['NE|8 Ave & W 50 St', 'SW|8 Ave & W 49 St'] },
  { i: 'pabt-42', n: '42 St–Port Authority Bus Terminal', s: '42 St–Port Authority', la: 40.757, lo: -73.9897, b: 'M', h: 'Midtown West', ada: 1, cr: 'heavy', cx: 'times-sq',
    p: ['IND8|A,C,E|Lower level|2|island|right|RIGHT|rear|middle'],
    a: ['NE|8 Ave & W 42 St|ada', 'SW|8 Ave & W 40 St', 'NW|9 Ave & W 42 St'] },
  { i: 'penn-8av', n: '34 St–Penn Station', s: '34 St–Penn Sta', la: 40.7523, lo: -73.9934, b: 'M', h: 'Midtown West', ada: 1, cr: 'heavy',
    p: ['IND8|A,C,E|Lower level|2|island|right|RIGHT|rear|middle'],
    a: ['NE|8 Ave & W 34 St|ada', 'SW|8 Ave & W 33 St', 'NW|9 Ave & W 34 St', 'SE|8 Ave & W 31 St'] },
  { i: '8av-23', n: '23 St', la: 40.7456, lo: -73.9982, b: 'M', h: 'Chelsea', cr: 'moderate',
    p: ['IND8|C,E|Platform level|1|side'], a: ['NE|8 Ave & W 23 St', 'SW|8 Ave & W 22 St'] },
  { i: '8av-14', n: '14 St–8 Av', s: '14 St–8 Av', la: 40.7404, lo: -74.0021, b: 'M', h: 'Chelsea', ada: 1, cr: 'heavy', cx: '14-8av',
    p: ['IND8|A,C,E|Lower level|2|island|right|RIGHT|rear|front', 'BMTL|L|Upper level|1|island|left|LEFT|front|middle'],
    a: ['NE|8 Ave & W 14 St|ada', 'SW|8 Ave & W 12 St', 'NW|8 Ave & W 16 St'] },
  { i: 'w4', n: 'W 4 St–Washington Sq', s: 'W 4 St', la: 40.7323, lo: -74.0004, b: 'M', h: 'Greenwich Village', cr: 'heavy',
    p: ['IND8|A,C,E|Lower level|3|island|right|RIGHT|rear|middle', 'IND6|B,D,F,M|Upper level|2|island|left|LEFT|front|middle'],
    a: ['NE|6 Ave & W 4 St', 'SW|6 Ave & W 3 St', 'NW|6 Ave & Waverly Pl'] },
  { i: 'spring-8av', n: 'Spring St', la: 40.7262, lo: -74.0038, b: 'M', h: 'SoHo', cr: 'light',
    p: ['IND8|C,E|Platform level|1|side'], a: ['NE|6 Ave & Spring St', 'SW|6 Ave & Spring St'] },
  { i: 'canal-8av', n: 'Canal St–8 Av', s: 'Canal St (A·C·E)', la: 40.7207, lo: -74.0053, b: 'M', h: 'Tribeca', cr: 'moderate',
    p: ['IND8|A,C,E|Platform level|2|island'], a: ['NE|6 Ave & Canal St', 'SW|Varick St & Canal St'] },
  { i: 'chambers-8av', n: 'Chambers St', la: 40.7143, lo: -74.0086, b: 'M', h: 'Tribeca', cr: 'moderate',
    p: ['IND8|A,C|Platform level|2|island'], a: ['NE|Church St & Chambers St', 'SW|Church St & Warren St'] },
  { i: 'wtc-e', n: 'World Trade Center', s: 'World Trade Ctr', la: 40.7126, lo: -74.0099, b: 'M', h: 'Financial District', ada: 1, cr: 'moderate',
    p: ['IND8|E|Platform level|1|island'], a: ['NE|Church St & Vesey St|ada', 'SW|Church St & Cortlandt St|ada'] },
  { i: 'fulton', n: 'Fulton St', la: 40.7101, lo: -74.0079, b: 'M', h: 'Financial District', ada: 1, cr: 'heavy',
    p: ['IND8|A,C|Lower level|2|island|left|LEFT|middle|middle', 'IRT7|2,3|Mezzanine level|1|island|right|RIGHT|rear|middle', 'IRTLEX|4,5|Deep level|3|side|left|LEFT|front|rear'],
    a: ['NE|Broadway & Fulton St|ada', 'SW|Broadway & John St', 'NW|Church St & Dey St|ada'] },
  { i: 'high-st', n: 'High St', la: 40.6996, lo: -73.9905, b: 'Bk', h: 'Brooklyn Heights', cr: 'light',
    p: ['IND8|A,C|Platform level|2|island'], a: ['NE|Cadman Plaza East & Prospect St', 'SW|Cadman Plaza West & Middagh St'] },
  { i: 'jay-st', n: 'Jay St–MetroTech', la: 40.6923, lo: -73.9873, b: 'Bk', h: 'Downtown Brooklyn', ada: 1, cr: 'heavy',
    p: ['IND8|A,C,F|Lower level|2|island|right|RIGHT|rear|middle', 'BMT4|R|Upper level|1|island|left|LEFT|front|middle'],
    a: ['NE|Jay St & Willoughby St|ada', 'SW|Jay St & Fulton St'] },
  { i: 'hoyt-scherm', n: 'Hoyt–Schermerhorn Sts', s: 'Hoyt–Schermerhorn', la: 40.6884, lo: -73.9853, b: 'Bk', h: 'Boerum Hill', cr: 'moderate',
    p: ['IND8|A,C,G|Platform level|1|island'], a: ['NE|Schermerhorn St & Hoyt St', 'SW|Schermerhorn St & Smith St'] },

  // ——— IND 6 Ave / 53 St / 63 St / Queens Blvd ———
  { i: '7av-53', n: '7 Av', la: 40.7625, lo: -73.9816, b: 'M', h: 'Midtown', cr: 'moderate',
    p: ['IND6|B,D|Lower level|2|island|right|RIGHT|rear|middle', 'IND53|E|Upper level|1|island|left|LEFT|front|middle'],
    a: ['NE|7 Ave & W 53 St', 'SW|7 Ave & W 52 St'] },
  { i: '57-6av', n: '57 St', la: 40.7635, lo: -73.9772, b: 'M', h: 'Midtown', ada: 1, cr: 'light',
    p: ['IND6|F|Platform level|2|island'], a: ['NE|6 Ave & W 57 St|ada', 'SW|6 Ave & W 55 St'] },
  { i: 'rock-4750', n: '47–50 Sts–Rockefeller Ctr', s: '47–50 Sts–Rock Ctr', la: 40.7587, lo: -73.9812, b: 'M', h: 'Midtown', ada: 1, cr: 'heavy',
    p: ['IND6|B,D,F,M|Platform level|2|island|left|LEFT|middle|middle'],
    a: ['NE|6 Ave & W 50 St|ada', 'SW|6 Ave & W 47 St', 'NW|Rockefeller Plaza & W 49 St'] },
  { i: 'bryant-42', n: '42 St–Bryant Pk', s: '42 St–Bryant Pk', la: 40.754, lo: -73.984, b: 'M', h: 'Midtown', cr: 'heavy', cx: 'bryant-5av',
    p: ['IND6|B,D,F,M|Lower level|2|island|right|RIGHT|rear|middle'],
    a: ['NE|6 Ave & W 42 St', 'SW|6 Ave & W 40 St', 'NW|6 Ave & W 43 St'] },
  { i: 'herald-34', n: '34 St–Herald Sq', s: '34 St–Herald Sq', la: 40.7496, lo: -73.988, b: 'M', h: 'Midtown', ada: 1, cr: 'heavy',
    p: ['IND6|B,D,F,M|Lower level|3|island|right|RIGHT|rear|middle', 'BMTB|N,Q,R,W|Upper level|2|island|left|LEFT|front|middle'],
    a: ['NE|6 Ave & W 34 St|ada', 'SW|6 Ave & W 32 St', 'NW|Broadway & W 35 St'] },
  { i: '23-6av', n: '23 St', la: 40.7428, lo: -73.9925, b: 'M', h: 'Flatiron', cr: 'moderate',
    p: ['IND6|F,M|Platform level|2|island'], a: ['NE|6 Ave & W 23 St', 'SW|6 Ave & W 22 St'] },
  { i: '14-6av', n: '14 St–6 Av', s: '14 St (F·M)', la: 40.7379, lo: -73.9964, b: 'M', h: 'Greenwich Village', ada: 1, cr: 'heavy', cx: '14-st-west',
    p: ['IND6|F,M|Lower level|2|island|right|RIGHT|middle|middle'],
    a: ['NE|6 Ave & W 14 St|ada', 'SW|6 Ave & W 13 St'] },
  { i: 'bway-laf', n: 'Broadway–Lafayette St', s: 'B’way–Lafayette St', la: 40.7253, lo: -73.9963, b: 'M', h: 'NoHo', ada: 1, cr: 'heavy', cx: 'bleecker',
    p: ['IND6|B,D,F,M|Lower level|2|island|left|LEFT|rear|rear', 'IRTLEX|6|Upper level|1|side|right|RIGHT|front|middle'],
    a: ['NE|Broadway & E Houston St|ada', 'SW|Lafayette St & Bleecker St', 'NW|Broadway & Bleecker St'] },
  { i: '2av', n: '2 Av', la: 40.7234, lo: -73.9887, b: 'M', h: 'Lower East Side', cr: 'light',
    p: ['IND6|F|Platform level|1|island'], a: ['NE|Houston St & 2 Ave', 'SW|Houston St & 1 Ave'] },
  { i: 'essex', n: 'Delancey St–Essex St', s: 'Delancey–Essex', la: 40.7185, lo: -73.988, b: 'M', h: 'Lower East Side', ada: 1, cr: 'moderate',
    p: ['IND6|F|Lower level|2|island|right|RIGHT|rear|middle'],
    a: ['NE|Delancey St & Essex St|ada', 'SW|Delancey St & Norfolk St'] },
  { i: 'east-bway', n: 'East Broadway', la: 40.7139, lo: -73.99, b: 'M', h: 'Two Bridges', cr: 'light',
    p: ['IND6|F|Platform level|2|island'], a: ['NE|East Broadway & Rutgers St', 'SW|East Broadway & Jefferson St'] },
  { i: 'york-st', n: 'York St', la: 40.7014, lo: -73.9868, b: 'Bk', h: 'DUMBO', ada: 1, cr: 'light',
    p: ['IND6|F|Platform level|3|island'], a: ['NE|Jay St & York St|ada'] },
  { i: 'grand-st', n: 'Grand St', la: 40.7182, lo: -73.9937, b: 'M', h: 'Chinatown', cr: 'moderate',
    p: ['IND6|B,D|Platform level|2|island'], a: ['NE|Grand St & Chrystie St', 'SW|Grand St & Bowery'] },
  { i: 'lex-63', n: 'Lexington Av/63 St', s: 'Lex Av/63 St', la: 40.7646, lo: -73.9668, b: 'M', h: 'Upper East Side', ada: 1, cr: 'moderate',
    p: ['IND63|F,Q|Deep level|3|island|left|LEFT|middle|middle'],
    a: ['NE|Lexington Ave & E 63 St|ada', 'SW|3 Ave & E 63 St'] },
  { i: 'lex-53', n: 'Lexington Av/53 St', s: 'Lex Av/53 St', la: 40.7576, lo: -73.9691, b: 'M', h: 'Midtown East', ada: 1, cr: 'heavy', cx: 'lex-51',
    p: ['IND53|E,M|Lower level|3|island|right|RIGHT|rear|middle'],
    a: ['NE|Lexington Ave & E 53 St|ada', 'SW|3 Ave & E 53 St'] },
  { i: '5av-53', n: '5 Av/53 St', la: 40.7601, lo: -73.9752, b: 'M', h: 'Midtown', cr: 'moderate',
    p: ['IND53|E,M|Platform level|2|side'], a: ['NE|5 Ave & E 53 St', 'SW|Madison Ave & E 53 St'] },
  { i: 'court-sq', n: 'Court Sq', la: 40.747, lo: -73.945, b: 'Q', h: 'Long Island City', ada: 1, cr: 'moderate',
    p: ['IND53|E,M|Lower level|2|island|right|RIGHT|rear|middle', 'INDG|G|Upper level|1|island|left|LEFT|front|middle', 'IRTFL|7|Elevated|0|island|left|LEFT|middle|middle'],
    a: ['NE|Jackson Ave & 44 Dr|ada', 'SW|23 St & 44 Dr'] },
  { i: 'queens-plaza', n: 'Queens Plaza', la: 40.749, lo: -73.9374, b: 'Q', h: 'Long Island City', ada: 1, cr: 'moderate',
    p: ['INDQB|E,M,R|Platform level|2|island|right|RIGHT|rear|middle'],
    a: ['NE|Queens Blvd & 41 Ave|ada', 'SW|Queens Blvd & Northern Blvd'] },
  { i: '21-queensbridge', n: '21 St–Queensbridge', s: '21 St–Qbridge', la: 40.7541, lo: -73.942, b: 'Q', h: 'Long Island City', ada: 1, cr: 'light',
    p: ['IND63|F|Deep level|3|island'], a: ['NE|21 St & 41 Ave|ada'] },
  { i: '36-st-q', n: '36 St', la: 40.7522, lo: -73.9288, b: 'Q', h: 'Sunnyside', cr: 'light',
    p: ['INDQB|M,R|Platform level|2|island'], a: ['NE|Broadway & 36 St', 'SW|Broadway & 35 St'] },
  { i: 'steinway', n: 'Steinway St', la: 40.7566, lo: -73.9204, b: 'Q', h: 'Astoria', cr: 'moderate',
    p: ['INDQB|M,R|Platform level|2|island'], a: ['NE|Broadway & Steinway St', 'SW|Broadway & 41 St'] },
  { i: 'northern', n: 'Northern Blvd', la: 40.7527, lo: -73.9061, b: 'Q', h: 'Jackson Heights', cr: 'light',
    p: ['INDQB|M,R|Platform level|2|island'], a: ['NE|Broadway & Northern Blvd', 'SW|Broadway & 66 St'] },
  { i: '65-st', n: '65 St', la: 40.7498, lo: -73.8985, b: 'Q', h: 'Woodside', cr: 'light',
    p: ['INDQB|M,R|Platform level|2|island'], a: ['NE|Broadway & 65 St', 'SW|Broadway & 64 St'] },
  { i: 'roosevelt', n: 'Jackson Hts–Roosevelt Av', s: 'Roosevelt Av', la: 40.7465, lo: -73.8912, b: 'Q', h: 'Jackson Heights', ada: 1, cr: 'heavy',
    p: ['INDQB|E,F,M,R|Lower level|2|island|right|RIGHT|rear|middle', 'IRTFL|7|Elevated|0|island|left|LEFT|front|middle'],
    a: ['NE|Roosevelt Ave & 74 St|ada', 'SW|Broadway & 73 St', 'NW|Roosevelt Ave & 75 St'] },

  // ——— IRT 7 Ave / Broadway ———
  { i: 'bway-145', n: '145 St', la: 40.8264, lo: -73.95, b: 'M', h: 'Hamilton Heights', cr: 'light',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Broadway & W 145 St', 'SW|Broadway & W 144 St'] },
  { i: 'bway-137', n: '137 St–City College', s: '137 St', la: 40.822, lo: -73.954, b: 'M', h: 'Hamilton Heights', cr: 'light',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Broadway & W 137 St', 'SW|Broadway & W 135 St'] },
  { i: 'bway-125', n: '125 St', la: 40.8156, lo: -73.9585, b: 'M', h: 'Manhattanville', cr: 'moderate',
    p: ['IRT7|1|Elevated|0|island'], a: ['NE|Broadway & W 125 St', 'SW|Broadway & W 124 St'] },
  { i: 'bway-116', n: '116 St–Columbia University', s: '116 St–Columbia', la: 40.8076, lo: -73.964, b: 'M', h: 'Morningside', cr: 'moderate',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Broadway & W 116 St', 'SW|Broadway & W 115 St'] },
  { i: 'bway-110', n: 'Cathedral Pkwy–110 St', s: 'Cathedral Pkwy', la: 40.8039, lo: -73.9666, b: 'M', h: 'Morningside', cr: 'light',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Broadway & W 110 St', 'SW|Broadway & W 109 St'] },
  { i: 'bway-103', n: '103 St', la: 40.7994, lo: -73.9682, b: 'M', h: 'Upper West Side', cr: 'light',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Broadway & W 104 St', 'SW|Broadway & W 103 St'] },
  { i: 'bway-96', n: '96 St', la: 40.7941, lo: -73.9722, b: 'M', h: 'Upper West Side', ada: 1, cr: 'heavy',
    p: ['IRT7|1,2,3|Platform level|1|island|right|RIGHT|middle|middle'],
    a: ['NE|Broadway & W 96 St|ada', 'SW|Broadway & W 94 St'] },
  { i: 'bway-86', n: '86 St', la: 40.7885, lo: -73.9761, b: 'M', h: 'Upper West Side', cr: 'moderate',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Broadway & W 86 St', 'SW|Broadway & W 85 St'] },
  { i: 'bway-79', n: '79 St', la: 40.7838, lo: -73.9799, b: 'M', h: 'Upper West Side', cr: 'moderate',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Broadway & W 79 St', 'SW|Broadway & W 78 St'] },
  { i: 'bway-72', n: '72 St', la: 40.7787, lo: -73.9819, b: 'M', h: 'Upper West Side', ada: 1, cr: 'heavy',
    p: ['IRT7|1,2,3|Platform level|1|island|left|LEFT|middle|middle'],
    a: ['NE|Broadway & W 72 St|ada', 'SW|Amsterdam Ave & W 72 St'] },
  { i: 'bway-66', n: '66 St–Lincoln Center', s: '66 St–Lincoln Ctr', la: 40.7734, lo: -73.9822, b: 'M', h: 'Lincoln Square', ada: 1, cr: 'moderate',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Broadway & W 66 St|ada', 'SW|Broadway & W 65 St'] },
  { i: 'bway-50', n: '50 St', la: 40.7615, lo: -73.9839, b: 'M', h: 'Midtown West', cr: 'moderate',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Broadway & W 50 St', 'SW|7 Ave & W 49 St'] },
  { i: 'times-sq', n: 'Times Sq–42 St', s: 'Times Sq–42 St', la: 40.7557, lo: -73.987, b: 'M', h: 'Midtown West', ada: 1, cr: 'heavy', cx: 'times-sq',
    p: ['IRT7|1,2,3|Mezzanine level|1|island|right|RIGHT|middle|front', 'BMTB|N,Q,R,W|Lower level|2|island|left|LEFT|rear|middle', 'IRTFL|7|Deep level|3|island|right|RIGHT|front|rear', 'IRTSH|S|Shuttle level|1|side|left|LEFT|middle|middle'],
    a: ['NE|7 Ave & W 42 St|ada', 'SW|Broadway & W 41 St', 'NW|8 Ave & W 42 St', 'SE|7 Ave & W 40 St'] },
  { i: 'penn-7av', n: '34 St–Penn Station', s: '34 St–Penn Sta', la: 40.7506, lo: -73.991, b: 'M', h: 'Midtown West', ada: 1, cr: 'heavy',
    p: ['IRT7|1,2,3|Platform level|1|island|left|LEFT|rear|middle'],
    a: ['NE|7 Ave & W 34 St|ada', 'SW|7 Ave & W 32 St|closed:Closed for repairs through Aug 12', 'NW|7 Ave & W 35 St'] },
  { i: 'bway-28', n: '28 St', la: 40.7472, lo: -73.9935, b: 'M', h: 'Chelsea', cr: 'light',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|7 Ave & W 28 St', 'SW|7 Ave & W 27 St'] },
  { i: 'bway-23', n: '23 St', la: 40.744, lo: -73.9954, b: 'M', h: 'Chelsea', cr: 'moderate',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|7 Ave & W 23 St', 'SW|7 Ave & W 22 St'] },
  { i: 'bway-18', n: '18 St', la: 40.741, lo: -73.9977, b: 'M', h: 'Chelsea', cr: 'light',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|7 Ave & W 18 St', 'SW|7 Ave & W 17 St'] },
  { i: '14-7av', n: '14 St–7 Av', s: '14 St (1·2·3)', la: 40.7376, lo: -73.9967, b: 'M', h: 'Greenwich Village', cr: 'heavy', cx: '14-st-west',
    p: ['IRT7|1,2,3|Platform level|1|island|right|RIGHT|rear|middle'],
    a: ['NE|7 Ave & W 14 St', 'SW|7 Ave & W 12 St'] },
  { i: 'christopher', n: 'Christopher St–Sheridan Sq', s: 'Christopher St', la: 40.7333, lo: -74.003, b: 'M', h: 'West Village', cr: 'moderate',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|7 Ave South & Christopher St', 'SW|7 Ave South & W 10 St'] },
  { i: 'houston-1', n: 'Houston St', la: 40.7284, lo: -74.0051, b: 'M', h: 'SoHo', cr: 'light',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Varick St & Houston St', 'SW|Varick St & King St'] },
  { i: 'canal-1', n: 'Canal St–Varick St', s: 'Canal St (1)', la: 40.7228, lo: -74.0064, b: 'M', h: 'Tribeca', cr: 'moderate',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Varick St & Canal St', 'SW|Varick St & Lispenard St'] },
  { i: 'franklin', n: 'Franklin St', la: 40.7192, lo: -74.0067, b: 'M', h: 'Tribeca', cr: 'light',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Varick St & Franklin St', 'SW|Varick St & N Moore St'] },
  { i: 'chambers-1', n: 'Chambers St', la: 40.7156, lo: -74.009, b: 'M', h: 'Tribeca', cr: 'moderate',
    p: ['IRT7|1,2,3|Platform level|1|island|left|LEFT|front|middle'],
    a: ['NE|W Broadway & Chambers St', 'SW|W Broadway & Warren St'] },
  { i: 'wtc-cortlandt', n: 'WTC Cortlandt', la: 40.7112, lo: -74.0122, b: 'M', h: 'Financial District', ada: 1, cr: 'moderate',
    p: ['IRT7|1|Platform level|1|island'], a: ['NE|Church St & Cortlandt St|ada'] },
  { i: 'rector-1', n: 'Rector St', la: 40.7075, lo: -74.0139, b: 'M', h: 'Financial District', cr: 'light',
    p: ['IRT7|1|Platform level|1|side'], a: ['NE|Greenwich St & Rector St', 'SW|Greenwich St & Morris St'] },
  { i: 'south-ferry', n: 'South Ferry', la: 40.702, lo: -74.0134, b: 'M', h: 'Financial District', ada: 1, cr: 'moderate',
    p: ['IRT7|1|Platform level|1|island'], a: ['NE|State St & Whitehall St|ada'] },
  { i: 'park-pl', n: 'Park Place', la: 40.7132, lo: -74.0089, b: 'M', h: 'Tribeca', cr: 'light',
    p: ['IRT7|2,3|Platform level|1|side'], a: ['NE|Broadway & Park Pl', 'SW|Church St & Park Pl'] },
  { i: 'wall-st', n: 'Wall St', s: 'Wall St (2·3)', la: 40.7071, lo: -74.0111, b: 'M', h: 'Financial District', cr: 'moderate',
    p: ['IRT7|2,3|Platform level|1|side'], a: ['NE|William St & Wall St', 'SW|Broadway & Wall St'] },
  { i: 'lenox-135', n: '135 St', la: 40.814, lo: -73.9406, b: 'M', h: 'Harlem', cr: 'light',
    p: ['IRT7|2,3|Platform level|1|island'], a: ['NE|Lenox Ave & W 135 St', 'SW|Lenox Ave & W 134 St'] },
  { i: 'lenox-125', n: '125 St', la: 40.8076, lo: -73.9454, b: 'M', h: 'Harlem', ada: 1, cr: 'moderate',
    p: ['IRT7|2,3|Platform level|1|island'], a: ['NE|Lenox Ave & W 125 St|ada', 'SW|Lenox Ave & W 124 St'] },
  { i: 'lenox-116', n: '116 St', la: 40.802, lo: -73.9496, b: 'M', h: 'Harlem', cr: 'light',
    p: ['IRT7|2,3|Platform level|1|island'], a: ['NE|Lenox Ave & W 116 St', 'SW|Lenox Ave & W 115 St'] },
  { i: 'cpn-110', n: 'Central Park North–110 St', s: 'Central Park North', la: 40.799, lo: -73.9518, b: 'M', h: 'Harlem', ada: 1, cr: 'light',
    p: ['IRT7|2,3|Platform level|1|island'], a: ['NE|Lenox Ave & W 110 St|ada', 'SW|Lenox Ave & W 109 St'] },

  // ——— IRT Lexington Ave ———
  { i: 'lex-125', n: '125 St', la: 40.8045, lo: -73.9375, b: 'M', h: 'East Harlem', ada: 1, cr: 'heavy',
    p: ['IRTLEX|4,5,6|Platform level|1|island|right|RIGHT|middle|middle'],
    a: ['NE|Lexington Ave & E 125 St|ada', 'SW|Lexington Ave & E 124 St'] },
  { i: 'lex-116', n: '116 St', la: 40.7982, lo: -73.9416, b: 'M', h: 'East Harlem', cr: 'moderate',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Lexington Ave & E 116 St', 'SW|Lexington Ave & E 115 St'] },
  { i: 'lex-110', n: '110 St', la: 40.795, lo: -73.9442, b: 'M', h: 'East Harlem', cr: 'light',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Lexington Ave & E 110 St', 'SW|Lexington Ave & E 109 St'] },
  { i: 'lex-103', n: '103 St', la: 40.7906, lo: -73.9476, b: 'M', h: 'East Harlem', cr: 'light',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Lexington Ave & E 103 St', 'SW|Lexington Ave & E 102 St'] },
  { i: 'lex-96', n: '96 St', la: 40.7856, lo: -73.951, b: 'M', h: 'Upper East Side', ada: 1, cr: 'moderate',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Lexington Ave & E 96 St|ada', 'SW|Lexington Ave & E 94 St'] },
  { i: 'lex-86', n: '86 St', la: 40.7796, lo: -73.9557, b: 'M', h: 'Upper East Side', ada: 1, cr: 'heavy',
    p: ['IRTLEX|4,5,6|Platform level|2|island|left|LEFT|middle|middle'],
    a: ['NE|Lexington Ave & E 86 St|ada', 'SW|Lexington Ave & E 85 St'] },
  { i: 'lex-77', n: '77 St', la: 40.7739, lo: -73.9599, b: 'M', h: 'Upper East Side', cr: 'moderate',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Lexington Ave & E 77 St', 'SW|Lexington Ave & E 76 St'] },
  { i: 'lex-68', n: '68 St–Hunter College', s: '68 St–Hunter', la: 40.7683, lo: -73.964, b: 'M', h: 'Upper East Side', cr: 'moderate',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Lexington Ave & E 68 St', 'SW|Lexington Ave & E 67 St'] },
  { i: 'lex-59', n: '59 St', s: '59 St (Lex)', la: 40.7627, lo: -73.9675, b: 'M', h: 'Midtown East', ada: 1, cr: 'heavy',
    p: ['IRTLEX|4,5,6|Lower level|2|island|right|RIGHT|rear|middle', 'BMTB|N,R,W|Upper level|1|island|left|LEFT|front|middle'],
    a: ['NE|Lexington Ave & E 59 St|ada', 'SW|Lexington Ave & E 58 St', 'NW|Park Ave & E 60 St'] },
  { i: '51-lex', n: '51 St', la: 40.757, lo: -73.9718, b: 'M', h: 'Midtown East', cr: 'heavy', cx: 'lex-51',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Lexington Ave & E 51 St', 'SW|Lexington Ave & E 50 St'] },
  { i: 'gct-42', n: 'Grand Central–42 St', s: 'Grand Central', la: 40.7527, lo: -73.9772, b: 'M', h: 'Midtown East', ada: 1, cr: 'heavy',
    p: ['IRTLEX|4,5,6|Lower level|2|island|right|RIGHT|rear|middle', 'IRTFL|7|Deep level|3|island|left|LEFT|front|rear', 'IRTSH|S|Shuttle level|1|side|right|RIGHT|middle|middle'],
    a: ['NE|Lexington Ave & E 43 St|ada', 'SW|Park Ave & E 42 St', 'NW|Vanderbilt Ave & E 42 St'] },
  { i: 'lex-33', n: '33 St', la: 40.746, lo: -73.9821, b: 'M', h: 'Murray Hill', cr: 'moderate',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Park Ave South & E 33 St', 'SW|Park Ave South & E 32 St'] },
  { i: 'lex-28', n: '28 St', la: 40.7431, lo: -73.9843, b: 'M', h: 'Kips Bay', cr: 'light',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Park Ave South & E 28 St', 'SW|Park Ave South & E 27 St'] },
  { i: 'lex-23', n: '23 St', la: 40.7397, lo: -73.9866, b: 'M', h: 'Gramercy', cr: 'moderate',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Park Ave South & E 23 St', 'SW|Park Ave South & E 22 St'] },
  { i: 'union-14', n: '14 St–Union Sq', s: 'Union Sq', la: 40.735, lo: -73.9903, b: 'M', h: 'Union Square', ada: 1, cr: 'heavy',
    p: ['IRTLEX|4,5,6|Lower level|2|island|right|RIGHT|rear|middle', 'BMTB|N,Q,R,W|Upper level|1|island|left|LEFT|front|middle', 'BMTL|L|Deep level|3|island|right|RIGHT|middle|middle'],
    a: ['NE|Union Sq East & E 15 St|ada', 'SW|Broadway & E 14 St', 'NW|Union Sq West & E 16 St', 'SE|4 Ave & E 14 St'] },
  { i: 'astor', n: 'Astor Pl', la: 40.73, lo: -73.9911, b: 'M', h: 'East Village', ada: 1, cr: 'moderate',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Lafayette St & Astor Pl|ada', 'SW|4 Ave & E 8 St'] },
  { i: 'spring-lex', n: 'Spring St', s: 'Spring St (6)', la: 40.7222, lo: -73.9971, b: 'M', h: 'SoHo', cr: 'moderate',
    p: ['IRTLEX|6|Platform level|1|side'], a: ['NE|Lafayette St & Spring St', 'SW|Lafayette St & Kenmare St'] },
  { i: 'canal-lex', n: 'Canal St', s: 'Canal St', la: 40.7188, lo: -74.0, b: 'M', h: 'Chinatown', cr: 'heavy',
    p: ['IRTLEX|6|Platform level|1|side|right|RIGHT|front|middle', 'BMTB|N,Q,R,W|Lower level|2|island|left|LEFT|rear|middle'],
    a: ['NE|Canal St & Lafayette St', 'SW|Canal St & Broadway'] },
  { i: 'bk-bridge', n: 'Brooklyn Bridge–City Hall', s: 'Brooklyn Bridge', la: 40.7132, lo: -74.0041, b: 'M', h: 'Civic Center', ada: 1, cr: 'moderate',
    p: ['IRTLEX|4,5,6|Platform level|2|island|left|LEFT|middle|middle'],
    a: ['NE|Centre St & Duane St|ada', 'SW|Park Row & Frankfort St'] },
  { i: 'wall-45', n: 'Wall St', s: 'Wall St (4·5)', la: 40.7074, lo: -74.0113, b: 'M', h: 'Financial District', cr: 'moderate',
    p: ['IRTLEX|4,5|Platform level|1|side'], a: ['NE|Broadway & Wall St', 'SW|Broadway & Exchange Pl'] },
  { i: 'bowling-green', n: 'Bowling Green', la: 40.7047, lo: -74.014, b: 'M', h: 'Financial District', ada: 1, cr: 'moderate',
    p: ['IRTLEX|4,5|Platform level|1|island'], a: ['NE|Broadway & Battery Pl|ada'] },
  { i: '138-gc', n: '138 St–Grand Concourse', s: '138 St', la: 40.8138, lo: -73.9299, b: 'Bx', h: 'Mott Haven', cr: 'light',
    p: ['IRTLEX|4|Platform level|1|island'], a: ['NE|Grand Concourse & E 138 St', 'SW|Grand Concourse & E 137 St'] },
  { i: '149-gc', n: '149 St–Grand Concourse', s: '149 St–Grand Conc', la: 40.8183, lo: -73.927, b: 'Bx', h: 'Concourse', ada: 1, cr: 'moderate',
    p: ['IRTLEX|4,5|Lower level|2|island|right|RIGHT|rear|middle', 'IRT7|2|Upper level|1|island|left|LEFT|front|middle'],
    a: ['NE|Grand Concourse & E 149 St|ada', 'SW|Grand Concourse & E 148 St'] },
  { i: '3av-149', n: '3 Av–149 St', la: 40.8161, lo: -73.9176, b: 'Bx', h: 'Melrose', cr: 'moderate',
    p: ['IRT7|2,5|Platform level|1|island'], a: ['NE|3 Ave & E 149 St', 'SW|3 Ave & E 148 St'] },

  // ——— BMT Broadway ———
  { i: '96-2av', n: '96 St', s: '96 St (Q)', la: 40.7842, lo: -73.9476, b: 'M', h: 'Upper East Side', ada: 1, cr: 'moderate',
    p: ['BMTB|Q|Deep level|3|island|left|LEFT|middle|middle'], a: ['NE|2 Ave & E 96 St|ada', 'SW|2 Ave & E 94 St|ada'] },
  { i: '86-2av', n: '86 St', s: '86 St (Q)', la: 40.7779, lo: -73.9518, b: 'M', h: 'Upper East Side', ada: 1, cr: 'moderate',
    p: ['BMTB|Q|Deep level|3|island|right|RIGHT|middle|middle'], a: ['NE|2 Ave & E 86 St|ada', 'SW|2 Ave & E 83 St|ada'] },
  { i: '72-2av', n: '72 St', s: '72 St (Q)', la: 40.7686, lo: -73.9583, b: 'M', h: 'Upper East Side', ada: 1, cr: 'moderate',
    p: ['BMTB|Q|Deep level|3|island|left|LEFT|middle|middle'], a: ['NE|2 Ave & E 72 St|ada', 'SW|2 Ave & E 69 St|ada'] },
  { i: '57-7av', n: '57 St–7 Av', la: 40.7644, lo: -73.98, b: 'M', h: 'Midtown', cr: 'moderate',
    p: ['BMTB|N,Q,R,W|Platform level|2|island'], a: ['NE|7 Ave & W 57 St', 'SW|7 Ave & W 55 St'] },
  { i: '49-st', n: '49 St', la: 40.7596, lo: -73.9843, b: 'M', h: 'Midtown', ada: 1, cr: 'moderate',
    p: ['BMTB|R,W|Platform level|1|island'], a: ['NE|7 Ave & W 49 St|ada', 'SW|7 Ave & W 47 St'] },
  { i: '28-bway', n: '28 St', s: '28 St (N·R·W)', la: 40.7455, lo: -73.9884, b: 'M', h: 'NoMad', cr: 'light',
    p: ['BMTB|R,W|Platform level|1|side'], a: ['NE|Broadway & W 28 St', 'SW|Broadway & W 27 St'] },
  { i: '23-bway', n: '23 St', s: '23 St (N·R·W)', la: 40.7411, lo: -73.9893, b: 'M', h: 'Flatiron', cr: 'moderate',
    p: ['BMTB|R,W|Platform level|1|side'], a: ['NE|Broadway & W 23 St', 'SW|5 Ave & W 22 St'] },
  { i: '8-st', n: '8 St–NYU', la: 40.7307, lo: -73.9927, b: 'M', h: 'Greenwich Village', cr: 'moderate',
    p: ['BMTB|R,W|Platform level|1|island'], a: ['NE|Broadway & E 8 St', 'SW|Broadway & Waverly Pl'] },
  { i: 'prince', n: 'Prince St', la: 40.7241, lo: -73.9976, b: 'M', h: 'SoHo', cr: 'heavy',
    p: ['BMTB|R,W|Platform level|1|side'], a: ['NE|Broadway & Prince St', 'SW|Broadway & Spring St'] },
  { i: 'city-hall-bway', n: 'City Hall', la: 40.7132, lo: -74.0067, b: 'M', h: 'Civic Center', cr: 'moderate',
    p: ['BMTB|R,W|Platform level|1|side'], a: ['NE|Broadway & Murray St', 'SW|Broadway & Barclay St'] },
  { i: 'cortlandt-bway', n: 'Cortlandt St', la: 40.7104, lo: -74.011, b: 'M', h: 'Financial District', ada: 1, cr: 'moderate',
    p: ['BMTB|R,W|Platform level|1|side'], a: ['NE|Church St & Cortlandt St|ada'] },
  { i: 'rector-bway', n: 'Rector St', s: 'Rector St (R·W)', la: 40.7078, lo: -74.0132, b: 'M', h: 'Financial District', cr: 'light',
    p: ['BMTB|R,W|Platform level|1|side'], a: ['NE|Trinity Pl & Rector St', 'SW|Trinity Pl & Morris St'] },
  { i: 'whitehall', n: 'Whitehall St–South Ferry', s: 'Whitehall St', la: 40.7031, lo: -74.0129, b: 'M', h: 'Financial District', ada: 1, cr: 'moderate',
    p: ['BMTB|R,W|Platform level|1|island'], a: ['NE|Whitehall St & Water St|ada'] },
  { i: 'dekalb', n: 'DeKalb Av', la: 40.6902, lo: -73.9817, b: 'Bk', h: 'Downtown Brooklyn', cr: 'moderate',
    p: ['BMTB|B,Q,R|Platform level|2|island'], a: ['NE|Flatbush Ave Ext & DeKalb Ave', 'SW|Fleet St & DeKalb Ave'] },
  { i: 'atlantic', n: 'Atlantic Av–Barclays Ctr', s: 'Atlantic Av', la: 40.6844, lo: -73.9776, b: 'Bk', h: 'Prospect Heights', ada: 1, cr: 'heavy',
    p: ['BMTB|B,Q|Lower level|2|island|right|RIGHT|rear|middle', 'BMT4|D,N,R|Mezzanine level|2|island|left|LEFT|front|middle', 'IRT7BK|2,3,4,5|Upper level|1|island|right|RIGHT|middle|middle'],
    a: ['NE|Flatbush Ave & Atlantic Ave|ada', 'SW|4 Ave & Pacific St', 'NW|Atlantic Ave & 4 Ave|ada'] },
  { i: 'queensboro-plaza', n: 'Queensboro Plaza', la: 40.7505, lo: -73.94, b: 'Q', h: 'Long Island City', ada: 1, cr: 'moderate',
    p: ['BMTB|N,W|Elevated|0|island|left|LEFT|middle|middle', 'IRTFL|7|Elevated upper|0|island|right|RIGHT|middle|middle'],
    a: ['NE|Queens Plaza North & 27 St|ada'] },

  // ——— BMT Canarsie (L) ———
  { i: '6av-l', n: '6 Av', s: '6 Av (L)', la: 40.7374, lo: -73.9968, b: 'M', h: 'Greenwich Village', cr: 'heavy', cx: '14-st-west',
    p: ['BMTL|L|Platform level|1|island|left|LEFT|middle|middle'], a: ['NE|6 Ave & W 14 St', 'SW|6 Ave & W 13 St'] },
  { i: '3av-l', n: '3 Av', s: '3 Av (L)', la: 40.7327, lo: -73.986, b: 'M', h: 'East Village', cr: 'moderate',
    p: ['BMTL|L|Platform level|1|island'], a: ['NE|3 Ave & E 14 St', 'SW|3 Ave & E 13 St'] },
  { i: '1av-l', n: '1 Av', s: '1 Av (L)', la: 40.7308, lo: -73.9817, b: 'M', h: 'East Village', cr: 'heavy',
    p: ['BMTL|L|Platform level|1|island'], a: ['NE|1 Ave & E 14 St', 'SW|Ave A & E 14 St'] },
  { i: 'bedford', n: 'Bedford Av', la: 40.7171, lo: -73.9568, b: 'Bk', h: 'Williamsburg', cr: 'heavy',
    p: ['BMTL|L|Platform level|1|island'], a: ['NE|Bedford Ave & N 7 St', 'SW|Bedford Ave & N 5 St'] },
  { i: 'lorimer', n: 'Lorimer St', la: 40.7141, lo: -73.9502, b: 'Bk', h: 'Williamsburg', cr: 'moderate', cx: 'lorimer-metro',
    p: ['BMTL|L|Platform level|1|island'], a: ['NE|Union Ave & Metropolitan Ave', 'SW|Lorimer St & Meeker Ave'] },
  { i: 'graham', n: 'Graham Av', la: 40.7148, lo: -73.9442, b: 'Bk', h: 'East Williamsburg', cr: 'light',
    p: ['BMTL|L|Platform level|1|island'], a: ['NE|Metropolitan Ave & Graham Ave', 'SW|Metropolitan Ave & Humboldt St'] },

  // ——— IRT Flushing (7) ———
  { i: 'hudson-yards', n: '34 St–Hudson Yards', s: 'Hudson Yards', la: 40.7556, lo: -74.0011, b: 'M', h: 'Hudson Yards', ada: 1, cr: 'moderate',
    p: ['IRTFL|7|Deep level|3|island|right|RIGHT|middle|middle'], a: ['NE|11 Ave & W 34 St|ada', 'SW|Hudson Blvd & W 33 St|ada'] },
  { i: '5av-7', n: '5 Av', s: '5 Av (7)', la: 40.7534, lo: -73.9814, b: 'M', h: 'Midtown', cr: 'moderate', cx: 'bryant-5av',
    p: ['IRTFL|7|Deep level|3|island|left|LEFT|middle|middle'], a: ['NE|5 Ave & W 42 St', 'SW|5 Ave & W 41 St'] },
  { i: 'vernon', n: 'Vernon Blvd–Jackson Av', s: 'Vernon–Jackson', la: 40.7425, lo: -73.9537, b: 'Q', h: 'Long Island City', cr: 'moderate',
    p: ['IRTFL|7|Deep level|2|island'], a: ['NE|Jackson Ave & Vernon Blvd', 'SW|Jackson Ave & 50 Ave'] },
  { i: 'hunters-pt', n: 'Hunters Point Av', s: 'Hunters Point', la: 40.7425, lo: -73.9485, b: 'Q', h: 'Long Island City', cr: 'light',
    p: ['IRTFL|7|Platform level|2|island'], a: ['NE|21 St & Hunters Point Ave'] },
  { i: '33-rawson', n: '33 St–Rawson St', s: '33 St', la: 40.7448, lo: -73.9308, b: 'Q', h: 'Sunnyside', cr: 'light',
    p: ['IRTFL|7|Elevated|0|side'], a: ['NE|Queens Blvd & 33 St', 'SW|Queens Blvd & 34 St'] },
  { i: '40-lowery', n: '40 St–Lowery St', s: '40 St', la: 40.7439, lo: -73.9242, b: 'Q', h: 'Sunnyside', cr: 'light',
    p: ['IRTFL|7|Elevated|0|side'], a: ['NE|Queens Blvd & 40 St', 'SW|Queens Blvd & 41 St'] },
  { i: '46-bliss', n: '46 St–Bliss St', s: '46 St', la: 40.7432, lo: -73.9186, b: 'Q', h: 'Sunnyside', cr: 'light',
    p: ['IRTFL|7|Elevated|0|side'], a: ['NE|Queens Blvd & 46 St', 'SW|Queens Blvd & 47 St'] },
  { i: '52-lincoln', n: '52 St', la: 40.7442, lo: -73.9128, b: 'Q', h: 'Woodside', cr: 'light',
    p: ['IRTFL|7|Elevated|0|side'], a: ['NE|Roosevelt Ave & 52 St', 'SW|Roosevelt Ave & 53 St'] },
  { i: '61-woodside', n: '61 St–Woodside', s: 'Woodside', la: 40.7456, lo: -73.9027, b: 'Q', h: 'Woodside', ada: 1, cr: 'moderate',
    p: ['IRTFL|7|Elevated|0|island|right|RIGHT|middle|middle'], a: ['NE|Roosevelt Ave & 61 St|ada'] },
  { i: '69-st', n: '69 St', la: 40.7464, lo: -73.8963, b: 'Q', h: 'Woodside', cr: 'light',
    p: ['IRTFL|7|Elevated|0|side'], a: ['NE|Roosevelt Ave & 69 St', 'SW|Roosevelt Ave & 70 St'] },

  // ——— IND Crosstown (G) + F in Brooklyn ———
  { i: '21-st-g', n: '21 St', s: '21 St (G)', la: 40.7443, lo: -73.9497, b: 'Q', h: 'Long Island City', cr: 'light',
    p: ['INDG|G|Platform level|2|island'], a: ['NE|Jackson Ave & 21 St'] },
  { i: 'greenpoint', n: 'Greenpoint Av', la: 40.7311, lo: -73.9541, b: 'Bk', h: 'Greenpoint', cr: 'moderate',
    p: ['INDG|G|Platform level|2|island'], a: ['NE|Manhattan Ave & Greenpoint Ave', 'SW|Manhattan Ave & Greenpoint Ave'] },
  { i: 'nassau-g', n: 'Nassau Av', la: 40.7245, lo: -73.9512, b: 'Bk', h: 'Greenpoint', cr: 'moderate',
    p: ['INDG|G|Platform level|2|island'], a: ['NE|Manhattan Ave & Nassau Ave', 'SW|Manhattan Ave & Norman Ave'] },
  { i: 'metropolitan-g', n: 'Metropolitan Av', s: 'Metropolitan Av', la: 40.7128, lo: -73.9513, b: 'Bk', h: 'Williamsburg', cr: 'moderate', cx: 'lorimer-metro',
    p: ['INDG|G|Platform level|2|island|right|RIGHT|rear|middle'], a: ['NE|Union Ave & Metropolitan Ave'] },
  { i: 'bway-g', n: 'Broadway', s: 'Broadway (G)', la: 40.7062, lo: -73.9502, b: 'Bk', h: 'Williamsburg', cr: 'light',
    p: ['INDG|G|Platform level|2|island'], a: ['NE|Union Ave & Broadway'] },
  { i: 'bergen', n: 'Bergen St', la: 40.6862, lo: -73.9908, b: 'Bk', h: 'Cobble Hill', cr: 'light',
    p: ['INDG|F,G|Platform level|2|island'], a: ['NE|Smith St & Bergen St', 'SW|Smith St & Wyckoff St'] },
  { i: 'carroll', n: 'Carroll St', la: 40.6801, lo: -73.995, b: 'Bk', h: 'Carroll Gardens', cr: 'light',
    p: ['INDG|F,G|Platform level|2|island'], a: ['NE|Smith St & Carroll St', 'SW|Smith St & 2 Pl'] },
  { i: 'smith-9', n: 'Smith–9 Sts', la: 40.6737, lo: -73.9958, b: 'Bk', h: 'Gowanus', ada: 1, cr: 'light',
    p: ['INDG|F,G|Elevated|0|island'], a: ['NE|Smith St & 9 St|ada'] },
  { i: '4av-9st', n: '4 Av–9 St', la: 40.6706, lo: -73.9899, b: 'Bk', h: 'Park Slope', cr: 'moderate',
    p: ['INDG|F,G|Elevated|0|island|left|LEFT|middle|middle', 'BMT4|R|Platform level|2|island|right|RIGHT|middle|middle'],
    a: ['NE|4 Ave & 9 St', 'SW|4 Ave & 10 St'] },
  { i: '7av-bk', n: '7 Av', s: '7 Av (Bk)', la: 40.666, lo: -73.98, b: 'Bk', h: 'Park Slope', cr: 'light',
    p: ['INDG|F,G|Platform level|2|island'], a: ['NE|7 Ave & 9 St', 'SW|7 Ave & 8 St'] },
  { i: '15-prospect', n: '15 St–Prospect Park', s: '15 St–Prospect Pk', la: 40.6604, lo: -73.9797, b: 'Bk', h: 'Windsor Terrace', cr: 'light',
    p: ['INDG|F,G|Platform level|2|island'], a: ['NE|Prospect Park West & 15 St'] },
  { i: 'church-f', n: 'Church Av', s: 'Church Av (F·G)', la: 40.6441, lo: -73.9796, b: 'Bk', h: 'Kensington', ada: 1, cr: 'moderate',
    p: ['INDG|F,G|Platform level|2|island'], a: ['NE|McDonald Ave & Church Ave|ada'] },

  // ——— BMT 4 Ave + IRT Brooklyn ———
  { i: 'borough-hall', n: 'Borough Hall', la: 40.6931, lo: -73.9899, b: 'Bk', h: 'Downtown Brooklyn', ada: 1, cr: 'heavy',
    p: ['IRT7BK|2,3,4,5|Lower level|2|island|right|RIGHT|rear|middle', 'BMT4|R|Upper level|1|island|left|LEFT|front|middle'],
    a: ['NE|Court St & Montague St|ada', 'SW|Court St & Joralemon St'] },
  { i: 'nevins', n: 'Nevins St', la: 40.6882, lo: -73.9807, b: 'Bk', h: 'Boerum Hill', cr: 'moderate',
    p: ['IRT7BK|2,3,4,5|Platform level|2|island'], a: ['NE|Flatbush Ave Ext & Nevins St', 'SW|Nevins St & Livingston St'] },
  { i: 'hoyt-st', n: 'Hoyt St', la: 40.6902, lo: -73.9852, b: 'Bk', h: 'Downtown Brooklyn', cr: 'moderate',
    p: ['IRT7BK|2,3|Platform level|1|side'], a: ['NE|Fulton St & Hoyt St', 'SW|Fulton St & Bond St'] },
  { i: 'clark-st', n: 'Clark St', la: 40.6976, lo: -73.9932, b: 'Bk', h: 'Brooklyn Heights', cr: 'light',
    p: ['IRT7BK|2,3|Deep level|3|island'], a: ['NE|Henry St & Clark St'] },
  { i: 'union-st', n: 'Union St', la: 40.6774, lo: -73.9832, b: 'Bk', h: 'Park Slope', cr: 'light',
    p: ['BMT4|R|Platform level|1|side'], a: ['NE|4 Ave & Union St', 'SW|4 Ave & President St'] },
  { i: 'prospect-av', n: 'Prospect Av', la: 40.665, lo: -73.9928, b: 'Bk', h: 'Greenwood', cr: 'light',
    p: ['BMT4|R|Platform level|1|side'], a: ['NE|4 Ave & Prospect Ave'] },
  { i: '25-st', n: '25 St', la: 40.6604, lo: -73.9981, b: 'Bk', h: 'Greenwood', cr: 'light',
    p: ['BMT4|R|Platform level|1|side'], a: ['NE|4 Ave & 25 St'] },
  { i: '36-st-bk', n: '36 St', s: '36 St (Bk)', la: 40.6551, lo: -74.0035, b: 'Bk', h: 'Sunset Park', cr: 'moderate',
    p: ['BMT4|D,N,R|Platform level|2|island'], a: ['NE|4 Ave & 36 St', 'SW|4 Ave & 38 St'] },

  // ——— IRT Eastern Pkwy (2·3 past Atlantic Av) ———
  { i: 'grand-army-2', n: 'Grand Army Plaza', la: 40.6752, lo: -73.971, b: 'Bk', h: 'Prospect Heights', cr: 'moderate',
    p: ['IRT7BK|2,3|Platform level|2|island'], a: ['NE|Flatbush Ave & Plaza St', 'SW|Flatbush Ave & Union St'] },
  { i: 'eastern-pkwy', n: 'Eastern Pkwy–Brooklyn Museum', s: 'Eastern Pkwy', la: 40.6716, lo: -73.964, b: 'Bk', h: 'Crown Heights', ada: 1, cr: 'moderate',
    p: ['IRT7BK|2,3|Platform level|2|island'], a: ['NE|Eastern Pkwy & Washington Ave|ada', 'SW|Eastern Pkwy & Underhill Ave'] },
  { i: 'franklin-av-23', n: 'Franklin Av', s: 'Franklin Av', la: 40.6706, lo: -73.9581, b: 'Bk', h: 'Crown Heights', ada: 1, cr: 'moderate',
    p: ['IRT7BK|2,3|Platform level|2|island'], a: ['NE|Eastern Pkwy & Franklin Ave|ada'] },

  // ——— BMT Astoria (N·W north of Queensboro Plaza) ———
  { i: '39-av', n: '39 Av–Dutch Kills', s: '39 Av', la: 40.7529, lo: -73.9325, b: 'Q', h: 'Long Island City', cr: 'light',
    p: ['BMTB|N,W|Elevated|0|side'], a: ['NE|31 St & 39 Ave'] },
  { i: 'bway-astoria', n: 'Broadway', s: 'Broadway (Astoria)', la: 40.7619, lo: -73.9254, b: 'Q', h: 'Astoria', cr: 'moderate',
    p: ['BMTB|N,W|Elevated|0|side'], a: ['NE|31 St & Broadway', 'SW|31 St & 33 Ave'] },
  { i: '30-av', n: '30 Av', la: 40.7666, lo: -73.9214, b: 'Q', h: 'Astoria', cr: 'moderate',
    p: ['BMTB|N,W|Elevated|0|side'], a: ['NE|31 St & 30 Ave'] },
  { i: 'astoria-blvd', n: 'Astoria Blvd', la: 40.7702, lo: -73.9176, b: 'Q', h: 'Astoria', ada: 1, cr: 'moderate',
    p: ['BMTB|N,W|Elevated|0|island'], a: ['NE|31 St & Astoria Blvd|ada'] },
  { i: 'ditmars', n: 'Astoria–Ditmars Blvd', s: 'Ditmars Blvd', la: 40.7752, lo: -73.912, b: 'Q', h: 'Astoria', cr: 'moderate',
    p: ['BMTB|N,W|Elevated|0|island'], a: ['NE|31 St & Ditmars Blvd'] },

  // ——— IRT Jerome Av (4 north of 149 St) ———
  { i: '161-yankee', n: '161 St–Yankee Stadium', s: '161 St–Yankee Stadium', la: 40.8276, lo: -73.9257, b: 'Bx', h: 'Concourse', ada: 1, cr: 'heavy',
    p: ['IRTLEX|4|Elevated|0|island|right|RIGHT|middle|middle'],
    a: ['NE|River Ave & E 161 St|ada', 'SW|River Ave & E 158 St'] },
];

// —————————————————————————————————————————————————————————————— builder

/** Deterministic 32-bit hash — used for stable "illustrative" geometry. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

const QUAD_OFFSET: Record<Quadrant, [number, number]> = {
  NE: [0.00035, 0.00042],
  NW: [0.00035, -0.00042],
  SE: [-0.00035, 0.00042],
  SW: [-0.00035, -0.00042],
  N: [0.0004, 0],
  S: [-0.0004, 0],
  E: [0, 0.0005],
  W: [0, -0.0005],
};

const CARS: CarPosition[] = ['front', 'middle', 'rear'];

function parsePlatform(row: Row, spec: string): Platform {
  const [trunk, lines, level, depth, layout, splitB, sideB, xferCar, exitCar] = spec.split('|');
  const h = hash(row.i + trunk);
  return {
    id: `${row.i}:${trunk}`,
    stationId: row.i,
    trunk: trunk as TrunkId,
    lines: lines.split(',') as Platform['lines'],
    level,
    depth: Number(depth),
    layout: layout as Platform['layout'],
    splitB: (splitB as 'left' | 'right') || (h % 2 === 0 ? 'left' : 'right'),
    sideB: (sideB as 'LEFT' | 'RIGHT') || ((h >>> 3) % 2 === 0 ? 'LEFT' : 'RIGHT'),
    xferCar: (xferCar as CarPosition) || CARS[(h >>> 5) % 3],
    exitCar: (exitCar as CarPosition) || CARS[(h >>> 9) % 3],
  };
}

function parseAccess(row: Row, spec: string, idx: number): AccessPoint {
  const [quadRaw, streets, flagsRaw] = spec.split('|');
  const quad = quadRaw as Quadrant;
  const flags = (flagsRaw || '').split(',').map((f) => f.trim()).filter(Boolean);
  const [dLat, dLon] = QUAD_OFFSET[quad];
  const closedFlag = flags.find((f) => f.startsWith('closed:'));
  return {
    id: `${row.i}:${quad}:${idx}`,
    streets,
    quadrant: quad,
    exitName: `Exit ${quad}`,
    lat: row.la + dLat,
    lon: row.lo + dLon,
    ada: flags.includes('ada'),
    onlyDir: flags.includes('dirA') ? 'A' : flags.includes('dirB') ? 'B' : undefined,
    closed: !!closedFlag,
    closedNote: closedFlag ? closedFlag.slice('closed:'.length) : undefined,
  };
}

function buildStation(row: Row): Station {
  const platforms = row.p.map((p) => parsePlatform(row, p));
  const access = row.a.map((a, i) => parseAccess(row, a, i));
  const lines = [...new Set(platforms.flatMap((p) => p.lines))];
  return {
    id: row.i,
    name: row.n,
    shortName: row.s ?? row.n,
    lat: row.la,
    lon: row.lo,
    borough: row.b,
    neighborhood: row.h,
    ada: row.ada === 1,
    elevatorOut: false,
    crowd: row.cr ?? 'moderate',
    complex: row.cx,
    platforms,
    access,
    lines,
  };
}

export const STATIONS: Station[] = ROWS.map(buildStation);

export const STATION_BY_ID: Record<string, Station> = Object.fromEntries(
  STATIONS.map((s) => [s.id, s]),
);
