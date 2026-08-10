import { useMemo } from 'react';
import { useApp } from '../state/store';
import { Badges, Btn, Card, CameraIcon, MicIcon, Scroll, SearchIcon } from '../components/ui';
import { C, R, SHADOW } from '../theme';
import { haversine, stationsNear } from '../engine/shared';
import { alertAffects, durationLabel, transfersLabel } from '../engine/router';
import { PLACES } from '../data/places';
import type { Itinerary, Place } from '../types';

/** A one-line summary of the in-station route, skipping the obvious steps. */
function howSentence(itin: Itinerary): string {
  const parts = itin.indoorSteps
    .filter((s) => s.kind === 'corridor' || s.kind === 'split' || s.kind === 'vertical')
    .map((s) => s.title.charAt(0).toLowerCase() + s.title.slice(1));
  const entry = `enter on ${itin.entrance.streets.split(' & ')[0]}`;
  return [entry, ...parts].join(', ');
}

function StatusDot({ tone }: { tone: 'good' | 'warn' | 'bad' | 'idle' }) {
  const map = { good: C.green, warn: C.amber, bad: C.red, idle: C.faint };
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: map[tone], flex: 'none' }} />;
}

export function Home() {
  const { state, go, planTo, dispatch, selectedRoute } = useApp();
  const { origin, alerts, planned, prefs } = state;

  const nearby = useMemo(() => stationsNear(origin.lat, origin.lon, { limit: 4, maxMeters: 1600 }), [origin]);
  const nearest = nearby[0];

  const nearestStatus = useMemo(() => {
    if (!nearest) return null;
    const st = nearest.station;
    const touched = new Set([st.id]);
    const lineIds = st.lines;
    const hits = alerts.filter((a) => alertAffects(a, lineIds, touched));
    const delay = hits.find((a) => a.kind === 'delay' || a.kind === 'service');
    const elevator = hits.find((a) => a.kind === 'elevator');
    const closedEntrances = st.access.filter((a) => a.closed).length;
    return {
      service: delay ? { tone: 'warn' as const, text: delay.kind === 'delay' ? 'Delays reported' : 'Changed service' } : { tone: 'good' as const, text: 'Good service' },
      crowd:
        st.crowd === 'heavy'
          ? { tone: 'bad' as const, text: 'Heavy crowds' }
          : st.crowd === 'moderate'
            ? { tone: 'warn' as const, text: 'Moderate crowds' }
            : { tone: 'good' as const, text: 'Light crowds' },
      elevator: !st.ada
        ? { tone: 'idle' as const, text: 'No elevator' }
        : elevator
          ? { tone: 'bad' as const, text: 'Elevator out' }
          : { tone: 'good' as const, text: 'Elevators working' },
      entrances: {
        tone: 'idle' as const,
        text: `${st.access.length - closedEntrances} entrance${st.access.length - closedEntrances === 1 ? '' : 's'} nearby`,
      },
    };
  }, [nearest, alerts]);

  const featured = planned[0]?.itinerary ?? (selectedRoute && state.trip ? selectedRoute : null);

  const quick = useMemo(() => {
    const chips: { place: Place; dot: string; needsAddress: boolean }[] = state.saved.map((s) => ({
      place: s,
      dot: s.dot,
      needsAddress: s.lat === 0,
    }));
    // Round it out with the closest few landmarks, so there is always somewhere to tap.
    const near = [...PLACES]
      .map((p) => ({ p, d: haversine(origin.lat, origin.lon, p.lat, p.lon) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .map((x) => ({ place: x.p, dot: C.faint, needsAddress: false }));
    return [...chips, ...near];
  }, [state.saved, origin]);

  return (
    <Scroll pad="12px 16px 100px" gap={13}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={() => dispatch({ type: 'open-search', intent: 'origin' })}
          aria-label="Change starting point"
          style={{
            appearance: 'none',
            border: 'none',
            font: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: C.white,
            borderRadius: 999,
            padding: '7px 12px',
            boxShadow: SHADOW.chip,
            cursor: 'pointer',
            maxWidth: 250,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flex: 'none',
              background: state.originLocked ? C.amber : state.geo.status === 'ok' ? C.brand : C.faint,
              animation: state.geo.status === 'asking' ? 'ml-pulse 1.4s infinite' : undefined,
            }}
          />
          <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {state.originLocked
              ? `From ${origin.name}`
              : state.geo.status === 'ok'
                ? `Near ${origin.address}`
                : origin.address}
          </span>
          <span style={{ fontSize: 10, color: C.faint }}>▾</span>
        </button>
        <button
          type="button"
          onClick={() => go('profile')}
          aria-label="Profile"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: C.ink,
            color: C.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          J
        </button>
      </div>

      <div
        onClick={() => dispatch({ type: 'open-search', intent: 'destination' })}
        className="ml-tap"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: C.white,
          borderRadius: R.panel,
          padding: 14,
          boxShadow: SHADOW.raise,
        }}
      >
        <SearchIcon />
        <span style={{ flex: 1, fontSize: 16, color: C.faint }}>Where are you going?</span>
        <MicIcon />
        <span style={{ width: 1, height: 20, background: C.line }} />
        <CameraIcon />
      </div>

      <div className="ml-hscroll">
        {quick.map(({ place: p, dot, needsAddress }) => (
          <button
            key={p.id}
            type="button"
            onClick={() => (needsAddress ? go('search') : planTo(p))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: C.white,
              borderRadius: 999,
              padding: '8px 13px',
              fontSize: 13,
              fontWeight: 600,
              color: C.body,
              whiteSpace: 'nowrap',
              boxShadow: SHADOW.chip,
              border: 'none',
              cursor: 'pointer',
              flex: 'none',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
            {p.name}
          </button>
        ))}
      </div>

      {featured ? (
        <Card accent="brand">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: C.brand, marginBottom: 8 }}>
            FIND THE EXACT PLATFORM
          </div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{featured.destination.name}</div>
          <div style={{ fontSize: 13, color: C.soft, margin: '2px 0 12px' }}>
            Planned trip · {durationLabel(featured.seconds)} · {transfersLabel(featured.transferCount).toLowerCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ width: 70, color: C.faint, fontSize: 12.5, flex: 'none', paddingTop: 2 }}>Enter at</span>
              <span style={{ fontWeight: 600 }}>
                {featured.entryStation.name} — {featured.entrance.streets}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ width: 70, color: C.faint, fontSize: 12.5, flex: 'none' }}>Platform</span>
              <span style={{ fontWeight: 600 }}>{featured.firstRide.direction.word}</span>
              <Badges platform={featured.firstRide.platform} stationId={featured.entryStation.id} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ width: 70, color: C.faint, fontSize: 12.5, flex: 'none', paddingTop: 2 }}>How</span>
              <span style={{ color: C.body, lineHeight: 1.45 }}>{howSentence(featured)}</span>
            </div>
          </div>
          <Btn
            kind="tint"
            size="sm"
            style={{ marginTop: 14 }}
            onClick={() => dispatch({ type: 'start-trip', itinerary: featured })}
          >
            Preview this trip
          </Btn>
        </Card>
      ) : (
        <Card accent="brand">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: C.brand, marginBottom: 8 }}>
            FIND THE EXACT PLATFORM
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>
            Tell MetroLens where you’re going and it will take you to the right platform.
          </div>
          <div style={{ fontSize: 13, color: C.soft, marginTop: 6, lineHeight: 1.45 }}>
            Not just the station — the entrance, the level, the side of the platform and the car to board.
          </div>
          <Btn kind="tint" size="sm" style={{ marginTop: 14 }} onClick={() => go('search')}>
            Choose a destination
          </Btn>
        </Card>
      )}

      <Btn
        kind="primary"
        onClick={() => {
          if (state.trip) go('outdoor');
          else if (featured) dispatch({ type: 'start-trip', itinerary: featured });
          else go('search');
        }}
        style={{
          borderRadius: R.panel,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          fontSize: 16.5,
          boxShadow: SHADOW.brandStrong,
        }}
      >
        <CameraIcon color={C.onColor} />
        {state.trip ? 'Resume AR Navigation' : 'Start AR Navigation'}
      </Btn>

      {nearest && nearestStatus && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Nearest station</span>
            <span style={{ fontSize: 12.5, color: C.faint }}>
              {Math.max(1, Math.round(nearest.walkSeconds / 60))} min walk
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{nearest.station.name}</span>
            {nearest.station.platforms.map((p) => (
              <Badges key={p.id} platform={p} stationId={nearest.station.id} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: C.body }}>
            {[nearestStatus.service, nearestStatus.crowd, nearestStatus.elevator, nearestStatus.entrances].map((s, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.bgAlt, borderRadius: 10, padding: '9px 11px' }}
              >
                <StatusDot tone={s.tone} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.text}</span>
              </div>
            ))}
          </div>
          {nearby.length > 1 && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: C.soft }}>
              Also nearby:{' '}
              {nearby
                .slice(1)
                .map(
                  (n) =>
                    `${n.station.shortName} ${n.station.lines.join('·')} (${Math.max(1, Math.round(n.walkSeconds / 60))} min)`,
                )
                .join(' · ')}
            </div>
          )}
        </Card>
      )}

      {prefs.elevatorOnly && (
        <div style={{ fontSize: 12.5, color: C.brand, fontWeight: 600, textAlign: 'center' }}>
          Step-free routing is on — routes use elevators only.
        </div>
      )}
      {selectedRoute && !state.trip && (
        <button
          type="button"
          onClick={() => go('routes')}
          style={{ appearance: 'none', border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: C.faint, cursor: 'pointer' }}
        >
          Back to route options for {selectedRoute.destination.name}
        </button>
      )}
    </Scroll>
  );
}
