import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp, currentSteps } from '../state/store';
import { Banner, Btn, Card, Chevrons, Scroll } from '../components/ui';
import { CameraPrompt, IndoorScene, OutdoorScene } from '../components/ARScene';
import { C, R, SHADOW } from '../theme';
import { STATION_BY_ID, accessServesDir, bearingTo, compassWord, haversine, linesServing, metersToFeet } from '../engine/shared';
import { oppositeDirWord } from '../engine/router';
import { useCamera, useHaptic, useHeading, useVoice, useWrongWayWatch } from '../hooks/useSensors';
import { turnAroundSteps } from '../engine/indoor';

/** Outdoor leg: walk from where the rider is to the correct street entrance. */
export function OutdoorAR() {
  const { state, go } = useApp();
  const trip = state.trip;
  const camera = useCamera();
  const { heading, request: requestHeading } = useHeading(true);
  const speak = useVoice(state.prefs.voice);
  const [showMap, setShowMap] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const info = useMemo(() => {
    if (!trip) return null;
    const { entrance, entryStation } = trip.itinerary;
    const liveMeters = haversine(state.origin.lat, state.origin.lon, entrance.lat, entrance.lon);
    // With a real fix we show live distance; otherwise we count down from the planned walk.
    const meters = state.geo.status === 'ok' ? liveMeters : Math.max(6, liveMeters - elapsed * 1.3);
    const bearing = bearingTo(state.origin.lat, state.origin.lon, entrance.lat, entrance.lon);
    // Only warn about an entrance that genuinely cannot reach this platform.
    const platform = trip.itinerary.firstRide.platform;
    const dir = trip.itinerary.firstRide.dir;
    const wrong = entryStation.access.find(
      (a) => a.id !== entrance.id && !a.closed && !accessServesDir(platform, a, dir),
    );
    const closed = entryStation.access.find((a) => a.closed);
    return { meters, bearing, entrance, entryStation, wrong, closed };
  }, [trip, state.origin, state.geo.status, elapsed]);

  useEffect(() => {
    if (info) speak(`Head ${compassWord(info.bearing)} to the ${info.entrance.streets} entrance.`);
  }, [info, speak]);

  if (!trip || !info) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No active trip</div>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }

  const itin = trip.itinerary;
  const ride = itin.firstRide;
  const opp = oppositeDirWord(ride.platform, ride.dir);
  const arrowOffset = heading == null ? 24 : ((info.bearing - heading + 540) % 360) - 180;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <OutdoorScene
        distanceFeet={metersToFeet(info.meters)}
        stationShortName={info.entryStation.shortName}
        platform={ride.platform}
        wrongEntranceLabel={info.wrong?.streets}
        cameraActive={camera.status === 'ok'}
        videoRef={camera.videoRef}
        onToggleMap={() => setShowMap((v) => !v)}
        mapLabel={showMap ? 'AR view' : 'Map view'}
        headingOffset={Math.max(-70, Math.min(70, arrowOffset))}
      />

      <div
        className="ml-vscroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 16px 90px',
          display: 'flex',
          flexDirection: 'column',
          gap: 11,
          marginTop: -18,
        }}
      >
        <Card style={{ boxShadow: SHADOW.sheet }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.brand, letterSpacing: '.06em' }}>
            WALKING TO YOUR ENTRANCE
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 5 }}>
            Head {compassWord(info.bearing)} to {info.entrance.streets}
          </div>
          <div style={{ fontSize: 14, color: C.soft, marginTop: 3, lineHeight: 1.45 }}>
            Your entrance is the {info.entrance.quadrant} corner at {info.entryStation.name}
            {info.entrance.ada ? ' — step-free' : ''}.
          </div>

          {showMap && (
            <div
              style={{
                marginTop: 12,
                background: C.bgAlt,
                borderRadius: 12,
                padding: 12,
                fontSize: 12.5,
                color: C.body,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Map view</div>
              {info.entryStation.access.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0' }}>
                  <span style={{ color: a.id === info.entrance.id ? C.greenDeep : a.closed ? C.red : C.soft, fontWeight: a.id === info.entrance.id ? 700 : 500 }}>
                    {a.streets}
                    {a.closed ? ' — closed' : ''}
                  </span>
                  <span style={{ color: C.faint, flex: 'none' }}>
                    {metersToFeet(haversine(state.origin.lat, state.origin.lon, a.lat, a.lon))} ft
                  </span>
                </div>
              ))}
            </div>
          )}

          {info.wrong ? (
            <Banner tone="warn" style={{ marginTop: 11 }}>
              Do not use the {info.wrong.streets} entrance — at this station it only reaches the {opp} platform.
            </Banner>
          ) : info.closed ? (
            <Banner tone="warn" style={{ marginTop: 11 }}>
              The {info.closed.streets} entrance is closed{info.closed.closedNote ? ` — ${info.closed.closedNote.toLowerCase()}` : ''}. Your route already avoids it.
            </Banner>
          ) : (
            <Banner tone="info" style={{ marginTop: 11 }} glyph="i">
              Other entrances here also reach your platform, but this one is closest to it.
            </Banner>
          )}

          <div style={{ marginTop: 11 }}>
            <CameraPrompt status={camera.status} onEnable={() => { camera.start(); void requestHeading(); }} />
          </div>

          {state.geo.status !== 'ok' && (
            <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8, lineHeight: 1.4 }}>
              {state.geo.status === 'denied'
                ? 'Location is off, so the distance is estimated from the planned walk.'
                : 'Waiting for a location fix — distance is estimated.'}
            </div>
          )}

          <Btn kind="primary" size="md" style={{ marginTop: 13 }} onClick={() => go('indoor')}>
            I’m at the entrance
          </Btn>
        </Card>
      </div>
    </div>
  );
}

/** In-station leg: entrance → platform, or transfer passage → next platform. */
export function IndoorNav() {
  const { state, go, dispatch } = useApp();
  const trip = state.trip;
  const camera = useCamera();
  const { heading } = useHeading(true);
  const speak = useVoice(state.prefs.voice);
  const buzz = useHaptic(state.prefs.haptic);

  const steps = trip ? currentSteps(trip) : [];
  const index = trip ? Math.min(trip.stepIndex, Math.max(0, steps.length - 1)) : 0;
  const step = steps[index];

  const onWrongWay = useCallback(() => go('wrongway'), [go]);
  useWrongWayWatch(step?.heading, heading, onWrongWay, {
    enabled: !!step && state.screen === 'indoor' && step.kind !== 'platform',
  });

  useEffect(() => {
    if (step) {
      speak(`${step.title}. ${step.detail}`);
      buzz(step.rotation !== 0 ? [40, 60, 40] : 25);
    }
  }, [step, speak, buzz]);

  // Auto-walk: advance through checkpoints on a timer, as a hands-free mode.
  useEffect(() => {
    if (!state.prefs.autoAdvance || state.mode !== 'ar' || !trip) return;
    if (index >= steps.length - 1) return;
    const id = window.setTimeout(() => dispatch({ type: 'step', delta: 1 }), 7000);
    return () => window.clearTimeout(id);
  }, [state.prefs.autoAdvance, state.mode, index, steps.length, trip, dispatch]);

  if (!trip || !step) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No active trip</div>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }

  const itin = trip.itinerary;
  const rides = itin.legs.filter((l) => l.type === 'ride');
  const leg = rides[Math.min(trip.legIndex, rides.length - 1)];
  const ride = leg && leg.type === 'ride' ? leg : itin.firstRide;
  const platform = ride.platform;
  const station = STATION_BY_ID[platform.stationId] ?? itin.entryStation;
  const platformLabel = `${ride.direction.word} ${linesServing(platform, platform.stationId).join('·')}`.trim();
  const last = index >= steps.length - 1;
  const progress = Math.round(((index + 1) / steps.length) * 100);

  const modes: { id: 'ar' | 'list' | 'map'; label: string }[] = [
    { id: 'ar', label: 'AR' },
    { id: 'list', label: 'Steps' },
    { id: 'map', label: 'Station map' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          flex: 'none',
          background: C.ink2,
          color: C.onColor,
          padding: '11px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>INSIDE</div>
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {station.shortName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
          <span style={{ background: 'rgba(255,255,255,.14)', borderRadius: 999, padding: '5px 10px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {step.level}
          </span>
          <span style={{ background: C.brand, borderRadius: 999, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {step.distanceFeet} ft
          </span>
        </div>
      </div>

      <div style={{ flex: 'none', display: 'flex', gap: 4, background: C.seg, margin: '10px 16px 0', borderRadius: 11, padding: 4 }}>
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => dispatch({ type: 'set-mode', mode: m.id })}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: 7,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: state.mode === m.id ? C.white : 'transparent',
              boxShadow: state.mode === m.id ? '0 1px 3px rgba(16,19,24,.12)' : 'none',
              color: C.ink,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="ml-vscroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {state.mode === 'ar' && (
          <IndoorScene
            step={step}
            platform={platform}
            platformLabel={platformLabel}
            cameraActive={camera.status === 'ok'}
            videoRef={camera.videoRef}
          />
        )}

        {state.mode === 'list' && (
          <div style={{ background: C.white, borderRadius: R.panel, margin: '10px 16px 0', padding: '6px 16px', flex: 'none', boxShadow: SHADOW.card }}>
            {steps.map((s, i) => {
              const done = i < index;
              const here = i === index;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => dispatch({ type: 'goto-step', index: i })}
                  style={{
                    appearance: 'none',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    width: '100%',
                    display: 'flex',
                    gap: 12,
                    padding: '11px 0',
                    opacity: i <= index ? 1 : 0.55,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: done ? C.greenDeep : here ? C.brand : C.idle,
                      color: i <= index ? C.white : C.faint,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      flex: 'none',
                      boxShadow: here ? '0 0 0 4px rgba(18,100,227,.16)' : 'none',
                    }}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span style={{ flex: 1, borderBottom: `1px solid ${C.line3}`, paddingBottom: 11 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</span>
                      <span style={{ fontSize: 11.5, color: C.faint, flex: 'none' }}>{s.distanceFeet} ft</span>
                    </span>
                    <span style={{ display: 'block', fontSize: 12.5, color: C.soft, marginTop: 2, lineHeight: 1.4 }}>
                      {s.detail}
                    </span>
                    {here && (
                      <span style={{ display: 'block', fontSize: 11, color: C.brand, fontWeight: 700, marginTop: 3 }}>
                        You are here
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {state.mode === 'map' && (
          <div style={{ background: C.white, borderRadius: R.panel, margin: '10px 16px 0', padding: 16, flex: 'none', boxShadow: SHADOW.card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Station map — path to your platform</span>
              <span style={{ fontSize: 11, color: C.faint, flex: 'none' }}>{station.shortName}</span>
            </div>
            {steps.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', width: 26 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: i < index ? C.greenDeep : i === index ? C.brand : C.idle,
                      boxShadow: i === index ? '0 0 0 4px rgba(18,100,227,.16)' : 'none',
                      flex: 'none',
                      marginTop: 14,
                    }}
                  />
                  <span style={{ flex: 1, width: 3, background: i < index ? C.greenDeep : C.track, marginTop: 3 }} />
                </div>
                <div style={{ flex: 1, background: C.bgAlt, borderRadius: 10, padding: '10px 13px', marginBottom: 8, opacity: i <= index ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{s.location}</span>
                    {i === index && <span style={{ fontSize: 11, color: C.brand, fontWeight: 700, flex: 'none' }}>You are here</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.soft, marginTop: 1 }}>{s.title}</div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 26, display: 'flex', justifyContent: 'center', flex: 'none' }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: C.greenDeep }} />
              </div>
              <div style={{ flex: 1, background: C.greenTint, borderRadius: 10, padding: '10px 13px' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.greenDeep }}>{platformLabel} platform</span>
              </div>
            </div>
          </div>
        )}

        <Card style={{ margin: '10px 16px 90px', boxShadow: SHADOW.cardUp, flex: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.faint, letterSpacing: '.05em' }}>
              STEP {index + 1} OF {steps.length}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'toggle-pref', key: 'autoAdvance' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: state.prefs.autoAdvance ? C.brandTint2 : C.line3,
                color: state.prefs.autoAdvance ? C.brand : C.soft,
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 999,
                padding: '4px 10px',
                cursor: 'pointer',
                border: 'none',
                flex: 'none',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: state.prefs.autoAdvance ? C.brand : C.soft,
                }}
              />
              {state.prefs.autoAdvance ? 'Auto-walk on' : 'Auto-walk off'}
            </button>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 7, letterSpacing: '-.01em' }}>{step.title}</div>
          <div style={{ fontSize: 14, color: C.soft, marginTop: 3, lineHeight: 1.45 }}>{step.detail}</div>
          <div style={{ height: 6, background: C.hair, borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
            <div style={{ height: 6, background: C.brand, borderRadius: 3, width: `${progress}%`, transition: 'width .3s' }} />
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
            <Btn kind="ghost" size="md" style={{ width: 'auto', flex: 'none', padding: '13px 16px' }} onClick={() => dispatch({ type: 'step', delta: -1 })} disabled={index === 0}>
              Back
            </Btn>
            <Btn
              kind="primary"
              size="md"
              onClick={() => (last ? dispatch({ type: 'arrive-platform' }) : dispatch({ type: 'step', delta: 1 }))}
            >
              {last ? 'I’m at the platform' : 'Next checkpoint'}
            </Btn>
          </div>
          <div style={{ marginTop: 11 }}>
            <CameraPrompt status={camera.status} onEnable={camera.start} compact />
          </div>
          <button
            type="button"
            onClick={() => go('wrongway')}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'transparent',
              width: '100%',
              textAlign: 'center',
              fontSize: 12,
              color: C.faint,
              fontWeight: 600,
              marginTop: 11,
              cursor: 'pointer',
              textDecoration: 'underline dotted',
            }}
          >
            This doesn’t look right
          </button>
        </Card>
      </div>
    </div>
  );
}

/** Recovery when the rider is heading down the wrong corridor. */
export function WrongWay() {
  const { state, go, dispatch } = useApp();
  const trip = state.trip;
  const buzz = useHaptic(state.prefs.haptic);
  const speak = useVoice(state.prefs.voice);

  useEffect(() => {
    buzz([80, 60, 80, 60, 120]);
    speak('This hallway does not lead to your platform. Turn around.');
  }, [buzz, speak]);

  if (!trip) {
    return (
      <Scroll>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }

  const ride = trip.itinerary.firstRide;
  const opp = oppositeDirWord(ride.platform, ride.dir);
  const lines = linesServing(ride.platform, ride.platform.stationId).join('·');
  const recovery = turnAroundSteps(trip.itinerary.entryStation, ride.platform, ride.dir, false);

  return (
    <div className="ml-vscroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.amberBg2, padding: 22, overflowY: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
        <span
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: C.amberTint,
            color: C.amberDeep,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            fontWeight: 800,
          }}
        >
          !
        </span>
        <div>
          <div style={{ fontSize: 23, fontWeight: 800, color: C.amberDeeper, letterSpacing: '-.01em' }}>
            This hallway doesn’t lead to your platform
          </div>
          <div style={{ fontSize: 15, color: C.amberDeep, marginTop: 9, lineHeight: 1.5, fontWeight: 600 }}>
            You may be heading toward the {opp} side. Your train leaves from the {ride.direction.word} platform.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0' }}>
          <Chevrons color={C.amberDeep} size={44} thickness={13} count={2} rotate={180} shadow={false} />
          <div style={{ fontSize: 13, fontWeight: 800, color: C.amberDeeper, marginTop: 14, letterSpacing: '.06em' }}>
            TURN AROUND
          </div>
        </div>
        <div
          style={{
            background: C.white,
            borderRadius: R.btn,
            padding: '14px 18px',
            boxShadow: '0 2px 10px rgba(147,55,13,.12)',
            fontSize: 14,
            color: C.body,
            lineHeight: 1.5,
            fontWeight: 600,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {recovery.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 9 }}>
              <span style={{ color: C.amberDeep, fontWeight: 800 }}>{i + 1}</span>
              <span>
                <span style={{ color: C.ink, fontWeight: 800 }}>{r.title}</span> — {r.detail}
              </span>
            </div>
          ))}
          <div style={{ fontSize: 13, color: C.soft, fontWeight: 500 }}>
            Look for <span style={{ color: C.ink, fontWeight: 800 }}>{ride.direction.word} {lines}</span>.
          </div>
        </div>
      </div>
      <Btn
        kind="amber"
        onClick={() => {
          // Drop the rider back at the split, which is where the mistake was made.
          const steps = currentSteps(trip);
          const splitAt = steps.findIndex((s) => s.kind === 'split');
          dispatch({ type: 'goto-step', index: splitAt >= 0 ? splitAt : Math.max(0, trip.stepIndex - 1) });
          go('indoor');
        }}
      >
        I’ve turned around — resume
      </Btn>
    </div>
  );
}
