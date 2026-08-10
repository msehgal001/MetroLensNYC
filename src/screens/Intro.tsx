import { useEffect } from 'react';
import { useApp } from '../state/store';
import { Bullet } from '../components/ui';
import { C } from '../theme';

export function Splash() {
  const { state, go } = useApp();
  useEffect(() => {
    const id = window.setTimeout(() => go(state.onboarded ? 'home' : 'onb'), 1700);
    return () => window.clearTimeout(id);
  }, [go, state.onboarded]);

  return (
    <div
      onClick={() => go(state.onboarded ? 'home' : 'onb')}
      className="ml-tap"
      style={{
        flex: 1,
        background: C.brand,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 26,
          background: 'rgba(255,255,255,.14)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 30, height: 30, borderTop: '9px solid #FFFFFF', borderLeft: '9px solid #FFFFFF', transform: 'rotate(45deg)', marginTop: 10 }} />
        <div style={{ width: 30, height: 30, borderTop: '9px solid rgba(255,255,255,.45)', borderLeft: '9px solid rgba(255,255,255,.45)', transform: 'rotate(45deg)', marginTop: -16 }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: C.onColor, letterSpacing: '-.02em' }}>MetroLens</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,.75)', marginTop: 6 }}>Never miss your platform.</div>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 26 }}>
        {[0, 0.2, 0.4].map((d) => (
          <span
            key={d}
            style={{ width: 8, height: 8, borderRadius: '50%', background: C.onColor, animation: `ml-dot 1.2s ${d}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

const PANELS = [
  {
    title: 'Find the exact platform',
    body: 'MetroLens doesn’t stop at the station door — it takes you to the exact platform, on the correct side.',
    art: (
      <div
        style={{
          background: C.ink2,
          borderRadius: 8,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 10px 24px rgba(16,19,24,.25)',
        }}
      >
        <span style={{ color: C.onColor, fontSize: 16, fontWeight: 700 }}>Downtown</span>
        <Bullet line="A" size={24} />
        <Bullet line="C" size={24} />
        <Bullet line="E" size={24} />
        <span style={{ color: C.onColor, fontSize: 18 }}>→</span>
      </div>
    ),
  },
  {
    title: 'Turn-by-turn, inside the station',
    body: 'AR arrows guide you through corridors, turnstiles and stairs — and warn you before a wrong turn.',
    art: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {[0, 0.25, 0.5].map((d) => (
          <div
            key={d}
            style={{
              width: 34,
              height: 34,
              borderTop: `10px solid ${C.brand}`,
              borderLeft: `10px solid ${C.brand}`,
              transform: 'rotate(45deg)',
              margin: '-10px 0',
              animation: `ml-pulse 1.5s ${d}s infinite`,
            }}
          />
        ))}
      </div>
    ),
  },
  {
    title: 'Board the right train',
    body: 'We confirm the train, the direction, the best car to board — and the exit at the other end.',
    art: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.greenTint, borderRadius: 14, padding: '12px 18px' }}>
          <Bullet line="A" size={30} />
          <span style={{ fontSize: 15, fontWeight: 700, color: C.greenDeep }}>Express — board this train</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.redBg, borderRadius: 14, padding: '12px 18px', opacity: 0.85 }}>
          <Bullet line="C" size={30} />
          <span style={{ fontSize: 15, fontWeight: 700, color: C.red }}>Local — do not board</span>
        </div>
      </div>
    ),
  },
];

export function Onboarding() {
  const { state, dispatch } = useApp();
  const panel = PANELS[state.obIndex] ?? PANELS[0];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.white, padding: '18px 22px 30px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => dispatch({ type: 'onboard-skip' })}
          style={{ appearance: 'none', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: C.faint, cursor: 'pointer', padding: '6px 10px' }}
        >
          Skip
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
          {panel.art}
          <div>
            <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-.01em' }}>{panel.title}</div>
            <div style={{ fontSize: 15, color: C.soft, lineHeight: 1.5, marginTop: 10, maxWidth: 280 }}>{panel.body}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {PANELS.map((_, i) => (
            <span
              key={i}
              style={{ width: 8, height: 8, borderRadius: '50%', background: i === state.obIndex ? C.brand : C.toggleOff }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'onboard-next' })}
          style={{
            appearance: 'none',
            border: 'none',
            alignSelf: 'stretch',
            background: C.brand,
            color: C.onColor,
            borderRadius: 14,
            padding: 15,
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(18,100,227,.3)',
          }}
        >
          {state.obIndex < PANELS.length - 1 ? 'Next' : 'Get started'}
        </button>
      </div>
    </div>
  );
}
