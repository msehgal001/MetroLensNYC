/** Device frame, status bar, tab bar and the floating "I'm Lost" affordance. */

import { useEffect, useState, type ReactNode } from 'react';
import { useApp, type Screen } from '../state/store';
import { C, STATUS_BAR } from '../theme';
import { tap } from '../lib/haptics';

const TAB_SCREENS: Screen[] = ['home', 'trips', 'alerts', 'profile'];
const LOST_SCREENS: Screen[] = ['outdoor', 'indoor', 'platform', 'arrivals', 'train', 'intrain', 'transfer', 'platform2'];

function StatusBar({ screen, clock }: { screen: Screen; clock: string }) {
  const { bg, fg } = STATUS_BAR[screen] ?? { bg: C.bg, fg: C.ink };
  return (
    <div
      style={{
        height: 46,
        flex: 'none',
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 26px',
        position: 'relative',
        zIndex: 5,
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 700 }}>{clock}</span>
      <div className="ml-notch" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5 }}>
          {[4, 6, 8, 10].map((h) => (
            <span key={h} style={{ width: 3, height: h, background: 'currentColor', borderRadius: 1 }} />
          ))}
        </div>
        <div
          style={{
            width: 24,
            height: 12,
            border: '1.5px solid currentColor',
            borderRadius: 3.5,
            padding: 1.5,
            display: 'flex',
          }}
        >
          <div style={{ width: '70%', height: '100%', background: 'currentColor', borderRadius: 1.5 }} />
        </div>
      </div>
    </div>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  const paths: Record<string, ReactNode> = {
    home: <path d="M3 8.2 L9 2.8 L15 8.2 V15.5 H10.8 V11 H7.2 V15.5 H3 Z" fill={color} />,
    navigate: <path d="M9 1.5 L15.5 16 L9 12.4 L2.5 16 Z" fill={color} />,
    trips: <path d="M4.5 2 H13.5 V16 L9 12.2 L4.5 16 Z" fill={color} />,
    alerts: (
      <>
        <path
          d="M9 1.8 C6.2 1.8 4.6 3.9 4.6 6.8 V10.6 L3.2 13 H14.8 L13.4 10.6 V6.8 C13.4 3.9 11.8 1.8 9 1.8 Z"
          fill={color}
        />
        <circle cx="9" cy="15.2" r="1.5" fill={color} />
      </>
    ),
    profile: (
      <>
        <circle cx="9" cy="5.8" r="3.2" fill={color} />
        <path d="M3.2 15.8 C3.2 12.2 5.8 10.6 9 10.6 C12.2 10.6 14.8 12.2 14.8 15.8 Z" fill={color} />
      </>
    ),
  };
  return (
    <svg width="22" height="22" viewBox="0 0 18 18" aria-hidden>
      {paths[name]}
    </svg>
  );
}

function TabBar() {
  const { state, go } = useApp();
  const tabs: { id: string; label: string; screen: Screen; active: boolean }[] = [
    { id: 'home', label: 'Home', screen: 'home', active: state.screen === 'home' },
    { id: 'navigate', label: 'Navigate', screen: 'search', active: state.screen === 'search' },
    { id: 'trips', label: 'Trips', screen: 'trips', active: state.screen === 'trips' },
    { id: 'alerts', label: 'Alerts', screen: 'alerts', active: state.screen === 'alerts' },
    { id: 'profile', label: 'Profile', screen: 'profile', active: state.screen === 'profile' },
  ];
  return (
    <nav
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        background: C.tabbar,
        borderTop: `1px solid ${C.tabbarLine}`,
        display: 'flex',
        padding: '9px 8px 24px',
        backdropFilter: 'blur(10px)',
        zIndex: 20,
      }}
    >
      {tabs.map((t) => {
        const color = t.active ? C.ink : C.tabOff;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => { tap(); go(t.screen); }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
          >
            <TabIcon name={t.id} color={color} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Resolve the rider's theme choice against the OS preference, live. */
function useDarkMode(choice: 'system' | 'light' | 'dark'): boolean {
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return choice === 'dark' || (choice === 'system' && systemDark);
}

export function Phone({ children }: { children: ReactNode }) {
  const { state, go, nowDate } = useApp();
  const clock = nowDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '');
  const showTabs = TAB_SCREENS.includes(state.screen);
  const showLost = LOST_SCREENS.includes(state.screen);
  const darkTheme = useDarkMode(state.prefs.theme);
  const dark = darkTheme || state.screen === 'splash' || state.screen === 'lost';

  // The page behind the device frame follows the theme too.
  useEffect(() => {
    document.body.classList.toggle('ml-page-dark', darkTheme);
  }, [darkTheme]);

  return (
    <div className={`ml-frame${state.prefs.largeText ? ' ml-large' : ''}`}>
      <div
        className={`ml-inner${darkTheme ? ' ml-dark' : ''}`}
        style={{ filter: state.prefs.highContrast ? 'contrast(1.25)' : 'none' }}
      >
        <StatusBar screen={state.screen} clock={clock} />
        <div className="ml-screen">
          {children}
          {showTabs && <TabBar />}
          {showLost && (
            <button
              type="button"
              className="ml-chrome"
              onClick={() => { tap(); go('lost'); }}
              style={{
                position: 'absolute',
                bottom: 22,
                left: '50%',
                transform: 'translateX(-50%)',
                background: C.red,
                color: C.onColor,
                fontWeight: 800,
                padding: '12px 24px',
                borderRadius: 999,
                boxShadow: '0 6px 18px rgba(217,45,32,.45)',
                cursor: 'pointer',
                fontSize: 15,
                whiteSpace: 'nowrap',
                border: 'none',
                zIndex: 21,
              }}
            >
              I’m Lost
            </button>
          )}
          {state.toast && <div className="ml-toast ml-chrome">{state.toast}</div>}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 132,
            height: 5,
            borderRadius: 3,
            background: dark ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.8)',
            zIndex: 25,
          }}
        />
      </div>
    </div>
  );
}
