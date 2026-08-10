/** Shared UI primitives. Visual values come straight from the MetroLens design. */

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { LineId, Platform } from '../types';
import { LINE_BY_ID, linesServing } from '../engine/shared';
import { tap } from '../lib/haptics';
import { C, R, SHADOW } from '../theme';

export function Card({
  children,
  style,
  accent,
  pad = 16,
  onClick,
}: {
  children: ReactNode;
  style?: CSSProperties;
  accent?: 'brand' | 'focus';
  pad?: number | string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.white,
        borderRadius: R.card,
        padding: pad,
        boxShadow: accent === 'focus' ? SHADOW.focus : SHADOW.card,
        border: accent ? `1.5px solid ${accent === 'focus' ? C.brand : 'rgba(18,100,227,.28)'}` : undefined,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Bullet({ line, size = 20 }: { line: LineId; size?: number }) {
  const l = LINE_BY_ID[line];
  return (
    <span
      aria-label={`${line} train`}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        borderRadius: '50%',
        background: l?.color ?? C.faint,
        color: l?.textColor ?? C.onColor,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.575),
        fontWeight: 700,
        flex: 'none',
      }}
    >
      {line}
    </span>
  );
}

export function Badges({
  platform,
  stationId,
  size = 20,
}: {
  platform: Platform;
  stationId?: string;
  size?: number;
}) {
  const lines = linesServing(platform, stationId ?? platform.stationId);
  return (
    <>
      {lines.map((l) => (
        <Bullet key={l} line={l} size={size} />
      ))}
    </>
  );
}

type BtnKind = 'primary' | 'tint' | 'ghost' | 'dark' | 'green' | 'amber' | 'danger' | 'faint';

const BTN: Record<BtnKind, CSSProperties> = {
  primary: { background: C.brand, color: C.onColor, boxShadow: SHADOW.brand },
  tint: { background: C.brandTint, color: C.brand },
  ghost: { background: C.hair, color: C.body },
  dark: { background: C.ink, color: C.white },
  green: { background: C.greenDeep, color: C.onColor, boxShadow: SHADOW.green },
  amber: { background: C.amberDeep, color: C.onColor },
  danger: { background: C.red, color: C.onColor },
  faint: { background: 'rgba(255,255,255,.1)', color: C.onColor },
};

export function Btn({
  kind = 'primary',
  children,
  onClick,
  style,
  size = 'lg',
  disabled,
}: {
  kind?: BtnKind;
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  size?: 'lg' | 'md' | 'sm';
  disabled?: boolean;
}) {
  const pad = size === 'lg' ? 15 : size === 'md' ? 13 : 11;
  const fontSize = size === 'lg' ? 16 : size === 'md' ? 15 : 14;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : () => { tap(); onClick?.(); }}
      disabled={disabled}
      style={{
        appearance: 'none',
        border: 'none',
        font: 'inherit',
        width: '100%',
        borderRadius: R.btn,
        padding: pad,
        textAlign: 'center',
        fontSize,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...BTN[kind],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function KV({
  label,
  children,
  w = 88,
}: {
  label: string;
  children: ReactNode;
  w?: number;
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ width: w, color: C.faint, fontSize: 12, flex: 'none', paddingTop: 1 }}>{label}</span>
      <span style={{ flex: 1, color: C.body, lineHeight: 1.45 }}>{children}</span>
    </div>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '.05em',
        color: C.faint,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick ? () => { tap(); onClick(); } : undefined}
      style={{
        appearance: 'none',
        border: 'none',
        font: 'inherit',
        background: active ? C.ink : C.white,
        color: active ? C.white : C.muted,
        borderRadius: 999,
        padding: '7px 13px',
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        boxShadow: active ? 'none' : SHADOW.chip,
        cursor: onClick ? 'pointer' : 'default',
        flex: 'none',
      }}
    >
      {children}
    </button>
  );
}

/** The stacked AR chevrons. */
export function Chevrons({
  color = C.onColor,
  size = 38,
  thickness = 11,
  count = 3,
  rotate = 0,
  shadow = true,
}: {
  color?: string;
  size?: number;
  thickness?: number;
  count?: number;
  rotate?: number;
  shadow?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `rotate(${rotate}deg)`,
        transition: 'transform .4s ease',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderTop: `${thickness}px solid ${color}`,
            borderLeft: `${thickness}px solid ${color}`,
            transform: 'rotate(45deg)',
            margin: `${-Math.round(thickness * 1.1)}px 0`,
            filter: shadow ? 'drop-shadow(0 3px 5px rgba(0,0,0,.35))' : undefined,
            animation: `ml-pulse 1.5s ${i * 0.25}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function BackBtn({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => { tap(); onClick(); }}
      style={{
        appearance: 'none',
        border: 'none',
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: C.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flex: 'none',
        boxShadow: '0 1px 3px rgba(16,19,24,.08)',
        padding: 0,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderLeft: `2.5px solid ${C.body}`,
          borderBottom: `2.5px solid ${C.body}`,
          transform: 'rotate(45deg)',
          marginLeft: 3,
        }}
      />
    </button>
  );
}

export function Toggle({
  on,
  onClick,
  title,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => { tap(); onClick(); }}
      style={{
        appearance: 'none',
        border: 'none',
        background: 'transparent',
        font: 'inherit',
        textAlign: 'left',
        width: '100%',
        padding: '13px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <span>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: C.ink }}>{title}</span>
        {sub && <span style={{ display: 'block', fontSize: 12, color: C.faint, marginTop: 1 }}>{sub}</span>}
      </span>
      <span
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          background: on ? C.brand : C.toggleOff,
          position: 'relative',
          flex: 'none',
          transition: 'background .2s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 20 : 2,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: C.onColor,
            boxShadow: '0 1px 3px rgba(0,0,0,.25)',
            transition: 'left .2s',
          }}
        />
      </span>
    </button>
  );
}

const BANNER = {
  warn: { bg: C.amberBg, dot: C.amberTint, dotFg: C.amberDeep, fg: C.amberInk },
  danger: { bg: C.redBg, dot: C.redTint, dotFg: C.red, fg: C.redDeep },
  success: { bg: C.greenTint, dot: C.greenDeep, dotFg: C.onColor, fg: C.greenDeeper },
  info: { bg: C.bgAlt, dot: C.hair, dotFg: C.soft, fg: C.body },
} as const;

export function Banner({
  tone = 'warn',
  children,
  glyph,
  style,
}: {
  tone?: keyof typeof BANNER;
  children: ReactNode;
  glyph?: string;
  style?: CSSProperties;
}) {
  const t = BANNER[tone];
  return (
    <div
      style={{
        display: 'flex',
        gap: 9,
        background: t.bg,
        borderRadius: 11,
        padding: '10px 12px',
        alignItems: 'flex-start',
        ...style,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: t.dot,
          color: t.dotFg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          flex: 'none',
        }}
      >
        {glyph ?? (tone === 'success' ? '✓' : tone === 'info' ? 'i' : '!')}
      </span>
      <span style={{ fontSize: 13, color: t.fg, fontWeight: 600, lineHeight: 1.4 }}>{children}</span>
    </div>
  );
}

export function Scroll({
  children,
  pad = '12px 16px 40px',
  gap = 12,
  style,
}: {
  children: ReactNode;
  pad?: string;
  gap?: number;
  style?: CSSProperties;
}) {
  // A new screen always starts at the top, never where the last one was scrolled to.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, []);
  return (
    <div
      ref={ref}
      className="ml-vscroll"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: pad,
        display: 'flex',
        flexDirection: 'column',
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function GreenHeader({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: C.greenDeep,
        color: C.onColor,
        padding: '13px 16px',
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        <span
          style={{
            width: 11,
            height: 6,
            borderLeft: `2.5px solid ${C.onColor}`,
            borderBottom: `2.5px solid ${C.onColor}`,
            transform: 'rotate(-45deg)',
            marginTop: -3,
          }}
        />
      </span>
      <span style={{ fontSize: 15.5, fontWeight: 700 }}>{children}</span>
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: C.line2 }} />;
}

export function SearchIcon({ size = 18, color = C.faint }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke={color} strokeWidth="2" />
      <line x1="12.5" y1="12.5" x2="16" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CameraIcon({ size = 20, color = C.brand }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 20 18" aria-hidden>
      <rect x="1" y="4" width="18" height="13" rx="3" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="10" cy="10.5" r="3.4" fill="none" stroke={color} strokeWidth="2" />
      <rect x="6.5" y="1" width="7" height="3.4" rx="1.4" fill={color} />
    </svg>
  );
}

export function MicIcon({ size = 18, color = C.soft }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <rect x="6.5" y="1.5" width="5" height="9" rx="2.5" fill={color} />
      <path d="M4 8.5 C4 11.5 6 13 9 13 C12 13 14 11.5 14 8.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9" y1="13" x2="9" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
