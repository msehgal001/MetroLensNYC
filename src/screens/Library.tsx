import { useMemo } from 'react';
import { useApp } from '../state/store';
import { BackBtn, Badges, Btn, Bullet, Card, Scroll, SectionLabel, Toggle } from '../components/ui';
import { C, R, SHADOW } from '../theme';
import { durationLabel, rideLegs, transfersLabel, PROFILES, PROFILE_ORDER } from '../engine/router';
import { alertsForItinerary } from '../engine/alerts';
import { STATION_BY_ID, linesServing } from '../engine/shared';
import { DATASET_NOTE } from '../data/stations';
import { live } from '../engine/live';
import type { RouteProfileId, ThemeChoice } from '../types';

function LiveStatusRow({ label, live: isLive, text }: { label: string; live: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '5px 0' }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isLive ? C.green : C.faint,
          animation: isLive ? 'ml-pulse 1.6s infinite' : undefined,
          flex: 'none',
          marginTop: 4,
        }}
      />
      <span style={{ fontSize: 13, color: C.body, lineHeight: 1.45 }}>
        <span style={{ fontWeight: 700 }}>{label}:</span> {text}
      </span>
    </div>
  );
}

function timeAgo(ts: number, now: number): string {
  const d = Math.floor((now - ts) / 86_400_000);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function Trips() {
  const { state, dispatch, go } = useApp();
  const { planned, recent, trip } = state;

  return (
    <Scroll pad="16px 16px 100px" gap={12}>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.01em' }}>Trips</div>

      {trip && (
        <>
          <SectionLabel>IN PROGRESS</SectionLabel>
          <Card accent="focus">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{trip.itinerary.destination.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.brand, flex: 'none' }}>
                {durationLabel(trip.itinerary.seconds)}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: C.soft, marginTop: 6 }}>
              {trip.itinerary.firstRide.direction.word}{' '}
              {linesServing(trip.itinerary.firstRide.platform, trip.itinerary.entryStation.id).join('·')} platform ·{' '}
              leg {trip.legIndex + 1} of {rideLegs(trip.itinerary).length}
            </div>
            <Btn kind="primary" size="sm" style={{ marginTop: 12 }} onClick={() => go('outdoor')}>
              Resume navigation
            </Btn>
          </Card>
        </>
      )}

      <SectionLabel>PLANNED</SectionLabel>
      {planned.length ? (
        planned.map((p) => {
          const rides = rideLegs(p.itinerary);
          return (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{p.destination.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.brand, flex: 'none' }}>
                  {durationLabel(p.itinerary.seconds)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 12, color: C.soft, flexWrap: 'wrap' }}>
                {rides.map((r, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {i > 0 && <span style={{ color: C.line }}>→</span>}
                    <Bullet line={r.line} size={20} />
                    <span>{r.kind === 'EXPRESS' ? 'Express' : 'Local'}</span>
                  </span>
                ))}
                <span>
                  · {p.itinerary.firstRide.direction.word}{' '}
                  {linesServing(p.itinerary.firstRide.platform, p.itinerary.entryStation.id).join('·')} platform ·{' '}
                  {transfersLabel(p.itinerary.transferCount).toLowerCase()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Btn kind="primary" size="sm" onClick={() => dispatch({ type: 'start-trip', itinerary: p.itinerary })}>
                  Resume
                </Btn>
                <Btn
                  kind="ghost"
                  size="sm"
                  style={{ width: 'auto', flex: 'none', padding: '11px 14px' }}
                  onClick={() => dispatch({ type: 'remove-planned', id: p.id })}
                >
                  Remove
                </Btn>
              </div>
            </Card>
          );
        })
      ) : (
        <Card>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>No planned trips yet</div>
          <div style={{ fontSize: 13, color: C.soft, marginTop: 4, lineHeight: 1.45 }}>
            Plan a route and tap “Save trip for later” — MetroLens keeps the entrance, platform and exit ready.
          </div>
          <Btn kind="tint" size="sm" style={{ marginTop: 12 }} onClick={() => go('search')}>
            Plan a trip
          </Btn>
        </Card>
      )}

      <SectionLabel style={{ marginTop: 4 }}>RECENT</SectionLabel>
      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        {recent.map((r, i) => (
          <div
            key={r.id}
            style={{
              padding: '13px 16px',
              borderBottom: i < recent.length - 1 ? `1px solid ${C.line2}` : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.from} → {r.to}
              </div>
              <div style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>
                {timeAgo(r.at, state.now)} · {r.platform}
              </div>
            </div>
            <span style={{ fontSize: 12.5, color: C.soft, fontWeight: 600, flex: 'none' }}>{r.minutes} min</span>
          </div>
        ))}
        {!recent.length && <div style={{ padding: 16, fontSize: 13, color: C.soft }}>Nothing yet.</div>}
      </div>
    </Scroll>
  );
}

export function AlertsScreen() {
  const { state, go } = useApp();
  const itinerary = state.trip?.itinerary ?? state.routes[0] ?? state.planned[0]?.itinerary ?? null;
  const impacts = useMemo(() => alertsForItinerary(state.alerts, itinerary), [state.alerts, itinerary]);
  const affecting = impacts.filter((i) => i.affectsRoute).length;

  const border = { high: C.red, medium: C.amber, low: C.faint } as const;

  return (
    <Scroll pad="16px 16px 100px" gap={12}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.01em' }}>Alerts</div>
        <div style={{ fontSize: 13, color: C.soft, marginTop: 2 }}>
          {itinerary
            ? `${affecting} of ${impacts.length} affect your route to ${itinerary.destination.name}`
            : 'Plan a trip to see what affects you'}
        </div>
      </div>

      {impacts.map(({ alert, affectsRoute, headline, detail }) => (
        <div
          key={alert.id}
          style={{
            background: C.white,
            borderRadius: R.panel,
            padding: 15,
            boxShadow: SHADOW.card,
            borderLeft: `4px solid ${affectsRoute ? border[alert.severity] : C.line}`,
            opacity: affectsRoute ? 1 : 0.72,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {alert.lines.length === 1 ? (
              <Bullet line={alert.lines[0]} size={24} />
            ) : (
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: alert.kind === 'elevator' ? C.amberTint : C.hair,
                  color: alert.kind === 'elevator' ? C.amberDeep : C.soft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  flex: 'none',
                }}
              >
                {alert.kind === 'elevator' ? '!' : 'i'}
              </span>
            )}
            <span style={{ fontSize: 14.5, fontWeight: 700, flex: 1 }}>{alert.title}</span>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{alert.body}</div>
          <div style={{ background: C.bgAlt, borderRadius: 10, padding: '10px 12px', marginTop: 9 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.faint, letterSpacing: '.06em' }}>
              WHAT IT MEANS FOR YOU
            </div>
            <div style={{ fontSize: 13, color: C.body, marginTop: 3, lineHeight: 1.45 }}>
              <span style={{ fontWeight: 700 }}>{headline}.</span> {detail}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8 }}>
            {alert.lines.join(' · ') || 'System-wide'} · {alert.until}
          </div>
        </div>
      ))}

      {!itinerary && (
        <Btn kind="tint" onClick={() => go('search')}>
          Plan a trip
        </Btn>
      )}
    </Scroll>
  );
}

export function Profile() {
  const { state, go, dispatch } = useApp();
  const { saved, prefs } = state;

  return (
    <Scroll pad="16px 16px 100px" gap={12}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: C.ink,
            color: C.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          J
        </div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Jordan</div>
          <div style={{ fontSize: 12.5, color: C.soft }}>Visiting NYC · first-time rider</div>
        </div>
      </div>

      <SectionLabel style={{ marginTop: 4 }}>SAVED PLACES</SectionLabel>
      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        {saved.map((s, i) => (
          <div
            key={s.id}
            style={{
              padding: '13px 16px',
              borderBottom: i < saved.length - 1 ? `1px solid ${C.line2}` : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flex: 'none' }} />
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{s.label}</span>
            <span style={{ fontSize: 12.5, color: C.faint }}>{s.address}</span>
          </div>
        ))}
      </div>

      <SectionLabel style={{ marginTop: 4 }}>ROUTE PREFERENCES</SectionLabel>
      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', borderBottom: `1px solid ${C.line2}` }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 8 }}>Default route filter</div>
          <div className="ml-hscroll" style={{ gap: 6 }}>
            {PROFILE_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  dispatch({ type: 'set-pref', key: 'defaultProfile', value: p as RouteProfileId });
                  dispatch({ type: 'route-filter', profile: p as RouteProfileId });
                }}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '6px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flex: 'none',
                  background: prefs.defaultProfile === p ? C.brand : C.hair,
                  color: prefs.defaultProfile === p ? C.onColor : C.body,
                }}
              >
                {PROFILES[p].label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '13px 16px', borderBottom: `1px solid ${C.line2}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Walking tolerance</span>
            <span style={{ fontSize: 13, color: C.soft, fontWeight: 600 }}>up to {prefs.walkingTolerance} min</span>
          </div>
          <input
            type="range"
            min={4}
            max={20}
            step={1}
            value={prefs.walkingTolerance}
            onChange={(e) => {
              dispatch({ type: 'set-pref', key: 'walkingTolerance', value: Number(e.target.value) });
            }}
            style={{ width: '100%', marginTop: 10, accentColor: C.brand }}
          />
        </div>
        <div style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>Max transfers</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  dispatch({ type: 'set-pref', key: 'maxTransfers', value: n });
                }}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  width: 34,
                  height: 30,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: prefs.maxTransfers === n ? C.brand : C.hair,
                  color: prefs.maxTransfers === n ? C.onColor : C.body,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SectionLabel style={{ marginTop: 4 }}>APPEARANCE</SectionLabel>
      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, padding: '13px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>Theme</span>
          <div style={{ display: 'flex', gap: 4, background: C.seg, borderRadius: 10, padding: 3 }}>
            {(['system', 'light', 'dark'] as ThemeChoice[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => dispatch({ type: 'set-pref', key: 'theme', value: t })}
                style={{
                  border: 'none',
                  borderRadius: 7,
                  padding: '6px 12px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: prefs.theme === t ? C.white : 'transparent',
                  color: prefs.theme === t ? C.ink : C.soft,
                  boxShadow: prefs.theme === t ? SHADOW.chip : 'none',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'system' ? 'Auto' : t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>
          Auto follows your device’s light or dark setting.
        </div>
      </div>

      <SectionLabel style={{ marginTop: 4 }}>NAVIGATION</SectionLabel>
      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => go('access')}
          style={{
            appearance: 'none',
            border: 'none',
            background: 'transparent',
            width: '100%',
            textAlign: 'left',
            padding: '13px 16px',
            borderBottom: `1px solid ${C.line2}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>Accessibility settings</span>
          <span style={{ width: 8, height: 8, borderTop: `2px solid ${C.faint}`, borderRight: `2px solid ${C.faint}`, transform: 'rotate(45deg)' }} />
        </button>
        <Toggle
          on={prefs.autoAdvance}
          onClick={() => dispatch({ type: 'toggle-pref', key: 'autoAdvance' })}
          title="Auto-walk"
          sub="Advance checkpoints automatically while you walk"
        />
        <div style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.line2}` }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>Voice language</span>
          <span style={{ fontSize: 13, color: C.soft, fontWeight: 600 }}>English (US)</span>
        </div>
      </div>

      <SectionLabel style={{ marginTop: 4 }}>LIVE DATA</SectionLabel>
      <Card>
        <LiveStatusRow
          label="Arrivals"
          live={live.status === 'live'}
          text={
            live.status === 'live'
              ? 'MTA GTFS-Realtime, refreshed every 30 s'
              : live.status === 'connecting'
                ? 'Connecting to the MTA feed…'
                : 'Feed unreachable — simulated timetable in use'
          }
        />
        <LiveStatusRow
          label="Service alerts"
          live={state.alertsLive}
          text={state.alertsLive ? 'Live MTA alerts, refreshed every 2 min' : 'MTA alerts unreachable — sample alerts shown'}
        />
        <LiveStatusRow
          label="Station registry"
          live={live.adaApplied}
          text={
            live.adaApplied
              ? 'Official MTA station data — real elevator (ADA) status applied'
              : 'Loading the official station dataset…'
          }
        />
        <div style={{ fontSize: 12.5, color: C.faint, marginTop: 10, lineHeight: 1.5 }}>{DATASET_NOTE}</div>
        <div style={{ fontSize: 12.5, color: C.faint, marginTop: 6, lineHeight: 1.5 }}>
          Location and compass come from your device when you allow them; a browser cannot position you
          underground, so in-station progress is advanced by you or by auto-walk.
        </div>
      </Card>
    </Scroll>
  );
}

export function AccessibilitySettings() {
  const { state, go, dispatch } = useApp();
  const { prefs } = state;
  // Routing preferences re-plan automatically in the store; no manual call needed.
  const toggle = (key: keyof typeof prefs) => () => dispatch({ type: 'toggle-pref', key });

  return (
    <Scroll>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BackBtn onClick={() => go('profile')} />
        <div style={{ fontSize: 17, fontWeight: 700 }}>Accessibility</div>
      </div>

      <SectionLabel>ROUTING</SectionLabel>
      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        <Toggle on={prefs.avoidStairs} onClick={toggle('avoidStairs')} title="Avoid stairs" sub="Prefer ramps and escalators" />
        <div style={{ height: 1, background: C.line2 }} />
        <Toggle on={prefs.elevatorOnly} onClick={toggle('elevatorOnly')} title="Elevator-only routes" sub="Skips stations with elevator outages" />
        <div style={{ height: 1, background: C.line2 }} />
        <Toggle on={prefs.fewerTransfers} onClick={toggle('fewerTransfers')} title="Fewer transfers" sub="Even when slower" />
        <div style={{ height: 1, background: C.line2 }} />
        <Toggle on={prefs.accessibleEntrances} onClick={toggle('accessibleEntrances')} title="Accessible entrances only" sub="Step-free street entrances" />
      </div>

      <SectionLabel>GUIDANCE</SectionLabel>
      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        <Toggle on={prefs.voice} onClick={toggle('voice')} title="Voice guidance" sub="Spoken step-by-step directions" />
        <div style={{ height: 1, background: C.line2 }} />
        <Toggle on={prefs.haptic} onClick={toggle('haptic')} title="Haptic guidance" sub="Vibrate at each turn" />
        <div style={{ height: 1, background: C.line2 }} />
        <Toggle on={prefs.largeText} onClick={toggle('largeText')} title="Large text" />
        <div style={{ height: 1, background: C.line2 }} />
        <Toggle on={prefs.highContrast} onClick={toggle('highContrast')} title="High contrast mode" />
      </div>

      {(prefs.elevatorOnly || prefs.avoidStairs || prefs.accessibleEntrances) && state.destination && (
        <Card>
          <div style={{ fontSize: 13, color: C.body, lineHeight: 1.5 }}>
            Routes to {state.destination.name} have been re-planned with these settings.
            {state.routes.length
              ? ` Best now: ${durationLabel(state.routes[0].seconds)} via ${rideLegs(state.routes[0])
                  .map((r) => r.line)
                  .join(' → ')}, entering at ${state.routes[0].entryStation.shortName}.`
              : ' No step-free route was found — try relaxing one setting.'}
          </div>
          {state.routes[0] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Badges platform={state.routes[0].firstRide.platform} stationId={state.routes[0].entryStation.id} size={20} />
              <span style={{ fontSize: 12.5, color: C.soft }}>
                {state.routes[0].firstRide.direction.word} platform at{' '}
                {STATION_BY_ID[state.routes[0].entryStation.id].shortName}
              </span>
            </div>
          )}
        </Card>
      )}
    </Scroll>
  );
}
