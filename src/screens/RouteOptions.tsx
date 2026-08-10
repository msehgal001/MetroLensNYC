import { useMemo } from 'react';
import { useApp } from '../state/store';
import { BackBtn, Badges, Banner, Btn, Bullet, Card, Chip, Scroll } from '../components/ui';
import { C } from '../theme';
import { PROFILES, PROFILE_ORDER, durationLabel, rideLegs, transfersLabel } from '../engine/router';
import { STATION_BY_ID, bearingTo, compassWord, haversine, linesServing, walkSeconds } from '../engine/shared';
import type { Itinerary, RouteProfileId } from '../types';

function LineChain({ itin }: { itin: Itinerary }) {
  const rides = rideLegs(itin);
  const walkIn = itin.legs.find((l) => l.type === 'walk');
  const walkOut = [...itin.legs].reverse().find((l) => l.type === 'walk');
  const arrow = <span style={{ color: C.line }}>→</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.soft, flexWrap: 'wrap' }}>
      {walkIn && walkIn.type === 'walk' && <span>Walk {Math.max(1, Math.round(walkIn.seconds / 60))}</span>}
      {rides.map((r, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {arrow}
          <Bullet line={r.line} size={22} />
          <span style={{ fontWeight: 600, color: C.body }}>{r.kind === 'EXPRESS' ? 'Express' : 'Local'}</span>
        </span>
      ))}
      {walkOut && walkOut.type === 'walk' && walkOut !== walkIn && (
        <>
          {arrow}
          <span>Walk {Math.max(1, Math.round(walkOut.seconds / 60))}</span>
        </>
      )}
    </div>
  );
}

function badgeFor(itin: Itinerary, isBest: boolean) {
  if (isBest) return { text: 'Recommended', bg: C.brand, fg: C.onColor };
  switch (itin.profile) {
    case 'simplest-platforms':
      return { text: 'Simplest platforms', bg: C.greenTint, fg: C.greenDeep };
    case 'accessible':
      return { text: 'Step-free', bg: C.brandTint, fg: C.brand };
    case 'fewest-transfers':
      return { text: 'Fewest transfers', bg: C.hair, fg: C.body };
    case 'least-walking':
      return { text: 'Least walking', bg: C.hair, fg: C.body };
    default:
      return { text: 'Fastest', bg: C.hair, fg: C.body };
  }
}

export function RouteOptions() {
  const { state, go, dispatch, replan } = useApp();
  const { routes, destination } = state;

  const walkMinutes = destination
    ? Math.max(
        1,
        Math.round(
          walkSeconds(haversine(state.origin.lat, state.origin.lon, destination.lat, destination.lon)) / 60,
        ),
      )
    : 0;

  const ordered = useMemo(() => {
    const preferred = routes.find((r) => r.profile === state.routeFilter);
    return preferred ? [preferred, ...routes.filter((r) => r !== preferred)] : routes;
  }, [routes, state.routeFilter]);

  if (!destination) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No destination yet</div>
        <Btn onClick={() => go('search')}>Search for a place</Btn>
      </Scroll>
    );
  }

  return (
    <Scroll>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BackBtn onClick={() => go('search')} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            To {destination.name}
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'open-search', intent: 'origin' })}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontSize: 12.5,
              color: C.brand,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            From {state.origin.name} · change
          </button>
        </div>
      </div>

      <div className="ml-hscroll" style={{ gap: 7 }}>
        {PROFILE_ORDER.map((p) => (
          <Chip
            key={p}
            active={state.routeFilter === p}
            onClick={() => {
              dispatch({ type: 'route-filter', profile: p as RouteProfileId });
              if (!routes.some((r) => r.profile === p)) replan();
            }}
          >
            {PROFILES[p].label}
          </Chip>
        ))}
      </div>

      {!ordered.length &&
        (walkMinutes <= 18 ? (
          <Banner tone="success" glyph="🚶">
            {destination.name} is a {walkMinutes} min walk — no train needed. Head{' '}
            {compassWord(bearingTo(state.origin.lat, state.origin.lon, destination.lat, destination.lon))} from here.
          </Banner>
        ) : (
          <Banner tone="danger">
            No route found to {destination.name} inside the covered network
            {state.prefs.elevatorOnly ? ' with step-free routing on' : ''}. Try a nearer destination
            {state.prefs.elevatorOnly ? ', or turn off "Elevator-only routes" in Accessibility' : ''}.
          </Banner>
        ))}

      {ordered.map((itin, i) => {
        const best = i === 0;
        const badge = badgeFor(itin, best);
        const platformLines = linesServing(itin.firstRide.platform, itin.entryStation.id).join('·');
        const transfers = itin.legs.filter((l) => l.type === 'transfer');
        return (
          <Card key={itin.id} accent={best ? 'focus' : undefined}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
              <span style={{ fontSize: best ? 24 : 20, fontWeight: best ? 800 : 700, letterSpacing: '-.02em' }}>
                {durationLabel(itin.seconds)}
              </span>
              <span
                style={{
                  background: badge.bg,
                  color: badge.fg,
                  fontSize: 11.5,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: '4px 10px',
                  flex: 'none',
                }}
              >
                {badge.text}
              </span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <LineChain itin={itin} />
            </div>

            {best ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, background: C.brandFaint, borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ width: 64, color: C.faint, fontSize: 12, flex: 'none' }}>Enter</span>
                  <span style={{ fontWeight: 600 }}>
                    {itin.entryStation.name} — {itin.entrance.streets}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ width: 64, color: C.faint, fontSize: 12, flex: 'none' }}>Platform</span>
                  <span style={{ fontWeight: 600 }}>
                    {itin.firstRide.direction.word} {platformLines} · {itin.firstRide.platform.level.toLowerCase()}
                  </span>
                  <Badges platform={itin.firstRide.platform} stationId={itin.entryStation.id} size={18} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ width: 64, color: C.faint, fontSize: 12, flex: 'none' }}>Train</span>
                  <span style={{ fontWeight: 600 }}>
                    {itin.firstRide.lineName} toward {itin.firstRide.toward}
                  </span>
                </div>
                {transfers.map((t) => (
                  <div key={t.type + STATION_BY_ID[(t as { stationId: string }).stationId].id} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ width: 64, color: C.faint, fontSize: 12, flex: 'none' }}>Transfer</span>
                    <span style={{ fontWeight: 600 }}>
                      {STATION_BY_ID[(t as { stationId: string }).stationId].shortName} →{' '}
                      {(t as { toLine: string }).toLine} platform
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>
                {transfersLabel(itin.transferCount)}. Enter at {itin.entryStation.shortName} ·{' '}
                {itin.firstRide.direction.word} {platformLines} platform · exit at {itin.exitStation.shortName},{' '}
                {Math.max(1, Math.round((itin.legs[itin.legs.length - 1] as { seconds: number }).seconds / 60))} min walk.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 12, color: C.soft, flexWrap: 'wrap' }}>
              <span>{Math.round(itin.walkSeconds / 60)} min walking</span>
              <span style={{ color: C.line }}>·</span>
              <span>{itin.stepFree ? 'Step-free' : 'Stairs involved'}</span>
              <span style={{ color: C.line }}>·</span>
              <span>{itin.entryStation.crowd === 'heavy' ? 'Heavy' : itin.entryStation.crowd === 'moderate' ? 'Moderate' : 'Light'} crowds</span>
            </div>

            {itin.warnings.length > 0 && (
              <Banner tone="warn" style={{ marginTop: 10 }}>
                {itin.warnings[0]}
              </Banner>
            )}

            <Btn
              kind={best ? 'primary' : 'tint'}
              size="md"
              style={{ marginTop: 13 }}
              onClick={() => dispatch({ type: 'start-trip', itinerary: itin })}
            >
              {best ? 'Choose this route' : 'Use this route'}
            </Btn>
          </Card>
        );
      })}
    </Scroll>
  );
}
