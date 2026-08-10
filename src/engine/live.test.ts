import { describe, expect, it } from 'vitest';
import {
  gtfsDir,
  matchStations,
  normalizeRoute,
  parseCsv,
  parseMtaAlerts,
  parseStationsCsv,
  parseTransiterStop,
} from './live';

const NOW = new Date('2026-08-10T09:41:00').getTime();

describe('route + direction normalization', () => {
  it('maps GTFS route variants to rider-facing lines', () => {
    expect(normalizeRoute('GS')).toBe('S');
    expect(normalizeRoute('7X')).toBe('7');
    expect(normalizeRoute('6X')).toBe('6');
    expect(normalizeRoute('A')).toBe('A');
  });

  it('maps N/S platform suffixes to our directions, with the Flushing exception', () => {
    expect(gtfsDir('A', 'N')).toBe('A'); // uptown
    expect(gtfsDir('A', 'S')).toBe('B'); // downtown
    expect(gtfsDir('L', 'N')).toBe('A'); // toward 8 Av
    expect(gtfsDir('7', 'N')).toBe('B'); // toward Flushing
    expect(gtfsDir('7', 'S')).toBe('A'); // toward Hudson Yards
    expect(gtfsDir('A', 'X')).toBeNull();
  });
});

describe('Transiter stop parsing', () => {
  const fixture = {
    id: 'A28',
    name: '34 St-Penn Station',
    stopTimes: [
      { arrival: { time: String(NOW / 1000 + 120) }, stop: { id: 'A28N' }, trip: { id: 't1', route: { id: 'A' }, destination: { name: '168 St' } } },
      { arrival: { time: String(NOW / 1000 + 300) }, stop: { id: 'A28S' }, trip: { id: 't2', route: { id: 'E' }, destination: { name: 'World Trade Center' } } },
      // A train that already left, far in the past — dropped.
      { arrival: { time: String(NOW / 1000 - 300) }, stop: { id: 'A28N' }, trip: { id: 't3', route: { id: 'C' } } },
      // Unknown route — dropped.
      { arrival: { time: String(NOW / 1000 + 60) }, stop: { id: 'A28N' }, trip: { id: 't4', route: { id: 'ZZ' } } },
    ],
  };

  it('produces arrivals with our directions, platforms and destinations', () => {
    const out = parseTransiterStop(fixture, 'penn-8av', NOW);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ line: 'A', dir: 'A', eta: 120, toward: '168 St', trunk: 'IND8' });
    expect(out[1]).toMatchObject({ line: 'E', dir: 'B', eta: 300 });
    expect(out[0].stationId).toBe('penn-8av');
  });

  it('is empty for a station we do not know', () => {
    expect(parseTransiterStop(fixture, 'nope', NOW)).toHaveLength(0);
  });
});

describe('official stations CSV', () => {
  const csv = [
    'GTFS Stop ID,Station ID,Complex ID,Division,Line,Stop Name,Borough,CBD,Daytime Routes,Structure,GTFS Latitude,GTFS Longitude,North Direction Label,South Direction Label,ADA,ADA Northbound,ADA Southbound,ADA Notes,Georeference',
    'A28,164,611,IND,8th Av - Fulton St,"34 St-Penn Station",M,true,A C E,Subway,40.752287,-73.993391,Uptown - Queens,Downtown & Brooklyn,1,1,1,,POINT (-73.993391 40.752287)',
    '128,318,318,IRT,Broadway - 7th Av,"34 St-Penn Station",M,true,1 2 3,Subway,40.750373,-73.991057,Uptown & The Bronx,Downtown,1,1,1,,POINT (-73.991057 40.750373)',
    'X99,1,1,IND,Nowhere,"Far Away",M,false,A,Subway,41.9,-72.0,Up,Down,0,0,0,,POINT (-72.0 41.9)',
  ].join('\n');

  it('parses quoted names and routes', () => {
    const rows = parseStationsCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ gtfsId: 'A28', routes: ['A', 'C', 'E'], ada: true });
    expect(rows[0].name).toBe('34 St-Penn Station');
  });

  it('handles quoted commas', () => {
    const rows = parseCsv('a,"b,c",d\n1,2,3');
    expect(rows[0]).toEqual(['a', 'b,c', 'd']);
  });

  it('matches our stations to GTFS ids by proximity + route overlap', () => {
    const map = matchStations(parseStationsCsv(csv));
    expect(map.get('penn-8av')).toEqual(['A28']);
    expect(map.get('penn-7av')).toEqual(['128']);
    // The far-away row must not match anything.
    for (const ids of map.values()) expect(ids).not.toContain('X99');
  });
});

describe('MTA alerts parsing', () => {
  const gtfsToOurs = new Map([
    ['A28', 'penn-8av'],
    ['128', 'penn-7av'],
  ]);
  const feed = {
    entity: [
      {
        alert: {
          'informed_entity': [{ 'route_id': 'A' }, { 'stop_id': 'A28N' }],
          'header_text': { translation: [{ text: 'Delays on A trains after signal problems', language: 'en' }] },
          'description_text': { translation: [{ text: 'Expect longer waits.', language: 'en' }] },
          'active_period': [{ start: NOW / 1000 - 600 }],
          'transit_realtime.mercury_alert': { 'alert_type': 'Delays' },
        },
      },
      {
        alert: {
          // Expired — dropped.
          'informed_entity': [{ 'route_id': 'L' }],
          'header_text': { translation: [{ text: 'Old news' }] },
          'active_period': [{ start: 0, end: NOW / 1000 - 100 }],
        },
      },
      {
        alert: {
          // No entities we know — dropped.
          'informed_entity': [{ 'route_id': 'SIR' }],
          'header_text': { translation: [{ text: 'Staten Island change' }] },
        },
      },
    ],
  };

  it('keeps active, scoped alerts and maps stops to our stations', () => {
    const out = parseMtaAlerts(feed, gtfsToOurs, NOW);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'delay', lines: ['A'], stations: ['penn-8av'], severity: 'high' });
    expect(out[0].title).toContain('Delays');
  });
});
