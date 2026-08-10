import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state/store';
import { C, R, SHADOW } from '../theme';
import { PLACES, DEFAULT_ORIGIN } from '../data/places';
import { STATIONS, haversine, stationsNear, walkSeconds } from '../engine/shared';
import { planRoute, transfersLabel } from '../engine/router';
import { tap } from '../lib/haptics';
import type { Itinerary, Place } from '../types';

interface Hit {
  place: Place;
  score: number;
}

function score(p: Place, q: string): number {
  const name = p.name.toLowerCase();
  const addr = p.address.toLowerCase();
  const kw = (p.keywords ?? []).join(' ');
  if (name.startsWith(q)) return 100 - name.length * 0.01;
  const words = name.split(/[\s—–,()]+/);
  if (words.some((w) => w.startsWith(q))) return 80;
  if (name.includes(q)) return 60;
  if (kw.includes(q)) return 45;
  if (addr.includes(q)) return 30;
  return 0;
}

/** Stations are destinations too — riders often just want to get to a station. */
const STATION_PLACES: Place[] = STATIONS.map((s) => ({
  id: `station-${s.id}`,
  name: s.name,
  address: `${s.lines.join('·')} · ${s.neighborhood}`,
  category: 'station',
  lat: s.lat,
  lon: s.lon,
  keywords: ['station', 'subway', s.neighborhood.toLowerCase()],
}));

function search(q: string): Hit[] {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  const pool = [...PLACES, ...STATION_PLACES];
  return pool
    .map((place) => ({ place, score: score(place, query) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.place.name.length - b.place.name.length)
    .slice(0, 6);
}

function complexityBadge(itin: Itinerary | null) {
  if (!itin) return { label: 'No route', bg: C.hair, fg: C.soft };
  if (itin.complexity < 35) return { label: 'Platforms: simple', bg: C.greenTint, fg: C.greenDeep };
  if (itin.complexity < 60) return { label: 'Platforms: moderate', bg: C.amberTint, fg: C.amberDeep };
  return { label: 'Platforms: complex', bg: C.redTint, fg: C.redDeep };
}

type Field = 'from' | 'to';

function FieldRow({
  label,
  active,
  value,
  placeholder,
  inputRef,
  onFocus,
  onChange,
  onEnter,
  dotColor,
}: {
  label: string;
  active: boolean;
  value: string;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onFocus: () => void;
  onChange: (v: string) => void;
  onEnter: () => void;
  dotColor: string;
}) {
  return (
    <div
      onClick={onFocus}
      className="ml-tap"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '11px 14px',
        background: active ? C.white : 'transparent',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flex: 'none' }} />
      <span style={{ width: 38, fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', color: C.faint, flex: 'none' }}>
        {label}
      </span>
      <input
        ref={inputRef}
        className="ml-reset-input"
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter();
        }}
        placeholder={placeholder}
        aria-label={label === 'FROM' ? 'Starting point' : 'Destination'}
        style={{ fontSize: 15.5, fontWeight: 500 }}
      />
    </div>
  );
}

export function Search() {
  const { state, dispatch, go, planTo } = useApp();
  const toRef = useRef<HTMLInputElement>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const [field, setField] = useState<Field>(state.searchIntent === 'origin' ? 'from' : 'to');
  // The From input shows the committed origin name until the rider starts typing.
  const [fromQuery, setFromQuery] = useState<string | null>(null);

  useEffect(() => {
    (field === 'from' ? fromRef : toRef).current?.focus();
  }, [field]);

  const activeQuery = field === 'from' ? (fromQuery ?? '') : state.query;
  const hits = useMemo(() => search(activeQuery), [activeQuery]);

  const suggestions = useMemo(() => {
    if (activeQuery.trim().length >= 2) return [];
    const near = stationsNear(state.origin.lat, state.origin.lon, { limit: 2, maxMeters: 1600 });
    const close = [...PLACES]
      .map((p) => ({ p, d: haversine(state.origin.lat, state.origin.lon, p.lat, p.lon) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5)
      .map((x) => x.p);
    return [
      ...near.map((n) => STATION_PLACES.find((s) => s.id === `station-${n.station.id}`)!).filter(Boolean),
      ...close,
    ];
  }, [activeQuery, state.origin]);

  const shown = hits.length ? hits.map((h) => h.place) : suggestions;

  const previews = useMemo(() => {
    if (field === 'from') return new Map<string, { itin: Itinerary | null; walkMinutes: number }>();
    const at = new Date(state.now);
    const out = new Map<string, { itin: Itinerary | null; walkMinutes: number }>();
    for (const place of shown) {
      const itin = planRoute(
        { origin: state.origin, destination: place, at, prefs: state.prefs, alerts: state.alerts },
        state.prefs.defaultProfile,
      );
      const walkMinutes = Math.max(
        1,
        Math.round(walkSeconds(haversine(state.origin.lat, state.origin.lon, place.lat, place.lon)) / 60),
      );
      out.set(place.id, { itin, walkMinutes });
    }
    return out;
    // `now` deliberately excluded: previews should not re-plan every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, shown.map((p) => p.id).join('|'), state.origin, state.prefs, state.alerts]);

  const chooseOrigin = (place: Place) => {
    tap();
    dispatch({ type: 'choose-origin', place });
    setFromQuery(null);
    if (state.destination) {
      // Re-plan happens in the store effect; jump straight to the refreshed options.
      go('routes');
    } else {
      setField('to');
    }
  };

  const pick = (place: Place) => {
    if (field === 'from') chooseOrigin(place);
    else {
      tap();
      planTo(place);
    }
  };

  const usingCurrent = !state.originLocked;

  return (
    <div className="ml-vscroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            flex: 1,
            background: C.bgAlt,
            borderRadius: R.btn,
            boxShadow: SHADOW.raise,
            border: `1.5px solid ${C.brand}`,
            overflow: 'hidden',
          }}
        >
          <FieldRow
            label="FROM"
            active={field === 'from'}
            value={field === 'from' && fromQuery != null ? fromQuery : state.origin.name}
            placeholder="Starting point"
            inputRef={fromRef}
            onFocus={() => {
              if (field !== 'from') {
                setField('from');
                setFromQuery('');
              }
            }}
            onChange={(v) => setFromQuery(v)}
            onEnter={() => hits[0] && chooseOrigin(hits[0].place)}
            dotColor={usingCurrent ? C.brand : C.amber}
          />
          <div style={{ height: 1, background: C.line2, margin: '0 14px' }} />
          <FieldRow
            label="TO"
            active={field === 'to'}
            value={state.query}
            placeholder="Where are you going?"
            inputRef={toRef}
            onFocus={() => setField('to')}
            onChange={(v) => dispatch({ type: 'query', value: v })}
            onEnter={() => hits[0] && pick(hits[0].place)}
            dotColor={C.greenDeep}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            tap();
            go('home');
          }}
          style={{ appearance: 'none', border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, color: C.brand, cursor: 'pointer', paddingTop: 13 }}
        >
          Cancel
        </button>
      </div>

      {field === 'from' && (
        <button
          type="button"
          onClick={() => {
            tap();
            // Unlock so the next geolocation fix (or the demo default) drives the origin.
            dispatch({ type: 'use-current-location' });
            if (state.geo.status !== 'ok') dispatch({ type: 'set-origin', origin: DEFAULT_ORIGIN });
            setFromQuery(null);
            if (state.destination) go('routes');
            else setField('to');
          }}
          style={{
            appearance: 'none',
            border: 'none',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: C.brandTint,
            color: C.brand,
            borderRadius: R.inner,
            padding: '12px 14px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span aria-hidden>◎</span>
          Use my current location
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: usingCurrent ? C.greenDeep : C.soft }}>
            {usingCurrent ? 'Active' : ''}
          </span>
        </button>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: C.faint, marginTop: 2 }}>
        {hits.length ? 'RESULTS' : field === 'from' ? 'START FROM' : 'NEARBY'}
      </div>

      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        {shown.map((place, i, arr) => {
          const entry = previews.get(place.id);
          const preview = entry?.itin ?? null;
          const walkable = !preview && (entry?.walkMinutes ?? 99) <= 18;
          const badge = complexityBadge(preview);
          const first = i === 0 && hits.length > 0;
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => pick(place)}
              style={{
                appearance: 'none',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.line2}` : 'none',
                background: first ? C.rowHi : C.white,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 15.5, fontWeight: first ? 700 : 600, color: C.ink }}>{place.name}</span>
                {field === 'to' && (
                  <span style={{ fontSize: 14, fontWeight: first ? 700 : 600, color: first ? C.brand : C.soft, flex: 'none' }}>
                    {preview ? `${Math.round(preview.seconds / 60)} min` : walkable ? `${entry!.walkMinutes} min` : '—'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: C.soft, marginTop: 2 }}>{place.address}</div>
              {field === 'to' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: C.soft, flexWrap: 'wrap' }}>
                  {preview ? (
                    <>
                      <span>{transfersLabel(preview.transferCount)}</span>
                      <span style={{ color: C.line }}>·</span>
                      <span>Nearest stop: {preview.exitStation.shortName}</span>
                      <span style={{ color: C.line }}>·</span>
                      <span style={{ background: badge.bg, color: badge.fg, fontWeight: 600, borderRadius: 6, padding: '2px 7px' }}>
                        {badge.label}
                      </span>
                    </>
                  ) : walkable ? (
                    <span>Walkable — no train needed</span>
                  ) : (
                    <span>Outside the covered network</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
        {!shown.length && (
          <div style={{ padding: 16, fontSize: 13.5, color: C.soft }}>No matches. Try a landmark or station name.</div>
        )}
      </div>

      <div style={{ fontSize: 12.5, color: C.faint, textAlign: 'center' }}>
        Searches addresses, landmarks, stations &amp; saved places
      </div>
    </div>
  );
}
