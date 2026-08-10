import { useEffect } from 'react';
import { currentRide, currentSteps, useApp } from '../state/store';
import { Badges, Btn, Chevrons } from '../components/ui';
import { STATION_BY_ID, linesServing } from '../engine/shared';
import { useHaptic, useVoice } from '../hooks/useSensors';

/**
 * The panic button. Strips everything away except: where you are, what you need,
 * which way to walk, and the single next move. Big type, high contrast, no chrome.
 */
export function Lost() {
  const { state, go, dispatch } = useApp();
  const trip = state.trip;
  const speak = useVoice(state.prefs.voice);
  const buzz = useHaptic(state.prefs.haptic);

  const ride = trip ? currentRide(trip) : null;
  const steps = trip ? currentSteps(trip) : [];
  const step = steps[Math.min(trip?.stepIndex ?? 0, Math.max(0, steps.length - 1))];

  useEffect(() => {
    buzz(40);
    if (ride && step) {
      speak(`You need the ${ride.direction.word} ${ride.line} platform. ${step.title}. ${step.detail}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!trip || !ride || !step) {
    return (
      <div style={{ flex: 1, background: '#101318', color: '#FFFFFF', padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>No trip in progress</div>
        <div style={{ fontSize: 15, color: '#B9C0CC', lineHeight: 1.5 }}>
          Start a trip and “I’m Lost” will show you where you are, the platform you need, and the next move.
        </div>
        <Btn kind="primary" onClick={() => go('home')}>
          Back to Home
        </Btn>
      </div>
    );
  }

  const station = STATION_BY_ID[ride.platform.stationId];
  const lines = linesServing(ride.platform, station.id);

  return (
    <div className="ml-vscroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#101318', color: '#FFFFFF', padding: '24px 22px', overflowY: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#8A93A3' }}>YOU ARE AT</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.01em', marginTop: 4 }}>{station.name}</div>
          <div style={{ fontSize: 13.5, color: '#8A93A3', marginTop: 2 }}>{step.level}</div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#8A93A3' }}>YOU NEED</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.01em' }}>
              {ride.direction.word} Platform
            </span>
            <Badges platform={ride.platform} stationId={station.id} size={26} />
          </div>
          <div style={{ fontSize: 13.5, color: '#8A93A3', marginTop: 4 }}>
            Signs read “{ride.direction.sign}” · {lines.join('·')}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <Chevrons color="#4D8DF7" size={52} thickness={15} rotate={step.rotation} shadow={false} />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#8A93A3' }}>NEXT STEP</div>
          <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.3, marginTop: 5 }}>{step.title}</div>
          <div style={{ fontSize: 15, color: '#B9C0CC', marginTop: 5, lineHeight: 1.45 }}>{step.detail}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 22 }}>
        <Btn
          kind="primary"
          onClick={() => {
            speak('');
            if (ride && step) speak(`${step.title}. ${step.detail}`);
          }}
        >
          Repeat directions
        </Btn>
        <div style={{ display: 'flex', gap: 9 }}>
          <Btn
            kind="faint"
            size="md"
            onClick={() => {
              dispatch({ type: 'set-mode', mode: 'map' });
              go('indoor');
            }}
          >
            Station map
          </Btn>
          <Btn
            kind="faint"
            size="md"
            onClick={() => {
              dispatch({ type: 'goto-step', index: 0 });
              go('pretrip');
            }}
          >
            Restart route
          </Btn>
        </div>
        <button
          type="button"
          onClick={() => go(state.returnTo === 'lost' ? 'indoor' : state.returnTo)}
          style={{
            appearance: 'none',
            border: 'none',
            background: 'transparent',
            textAlign: 'center',
            fontSize: 13.5,
            color: '#8A93A3',
            fontWeight: 600,
            padding: 8,
            cursor: 'pointer',
          }}
        >
          I’m okay — back to navigation
        </button>
      </div>
    </div>
  );
}
