/**
 * The AR viewport.
 *
 * When the camera is granted, the live feed is the backdrop and the guidance is drawn on
 * top. When it is not, the same guidance is drawn over an illustrated scene — the arrow,
 * the sign callout and the warnings are identical either way, so nothing about the
 * instruction depends on having a camera.
 */

import type { ReactNode, RefObject } from 'react';
import type { NavStep, Platform } from '../types';
import { Badges, Chevrons } from './ui';
import { C } from '../theme';

function Pill({
  children,
  bg = 'rgba(16,19,24,.78)',
  fg = C.onColor,
  style,
}: {
  children: ReactNode;
  bg?: string;
  fg?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 999,
        padding: '6px 12px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CameraLayer({
  videoRef,
  active,
}: {
  videoRef: RefObject<HTMLVideoElement>;
  active: boolean;
}) {
  return (
    <video
      ref={videoRef}
      className="ml-video"
      playsInline
      muted
      autoPlay
      style={{ display: active ? 'block' : 'none', zIndex: 0 }}
    />
  );
}

/** Illustrated street scene: buildings, sidewalk, the right entrance and a decoy. */
function StreetArt() {
  return (
    <>
      <div style={{ position: 'absolute', top: 20, left: -12, width: 150, height: 180, background: 'repeating-linear-gradient(180deg,#95A1AD 0 26px,#8A96A2 26px 31px)' }} />
      <div style={{ position: 'absolute', top: 0, right: -16, width: 170, height: 158, background: 'repeating-linear-gradient(180deg,#A2ACB6 0 24px,#97A1AB 24px 29px)' }} />
      <div style={{ position: 'absolute', bottom: 96, left: 0, right: 0, height: 46, background: '#63676D' }} />
      <div style={{ position: 'absolute', bottom: 117, left: 0, right: 0, height: 4, background: 'repeating-linear-gradient(90deg,#E8E9ED 0 22px,transparent 22px 44px)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 96, background: '#9EA3A8' }} />
    </>
  );
}

export function OutdoorScene({
  distanceFeet,
  stationShortName,
  platform,
  wrongEntranceLabel,
  cameraActive,
  videoRef,
  onToggleMap,
  mapLabel,
  headingOffset,
}: {
  distanceFeet: number;
  stationShortName: string;
  platform: Platform;
  wrongEntranceLabel?: string;
  cameraActive: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  onToggleMap: () => void;
  mapLabel: string;
  headingOffset: number;
}) {
  return (
    <div style={{ position: 'relative', height: 330, background: '#C7D6E4', overflow: 'hidden', flex: 'none' }}>
      <CameraLayer videoRef={videoRef} active={cameraActive} />
      {!cameraActive && <StreetArt />}

      {!cameraActive && wrongEntranceLabel && (
        <div style={{ position: 'absolute', left: 20, bottom: 128, width: 74, textAlign: 'center' }}>
          <div style={{ height: 34, background: '#33383E', borderRadius: 4, opacity: 0.75 }} />
          <div
            style={{
              marginTop: 5,
              display: 'inline-block',
              background: C.red,
              color: C.onColor,
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 999,
              padding: '3px 8px',
              whiteSpace: 'nowrap',
            }}
          >
            Not this one
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          right: 18,
          bottom: 26,
          width: 138,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'center',
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: C.ink2,
            borderRadius: 6,
            padding: '6px 9px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 4px 10px rgba(0,0,0,.3)',
          }}
        >
          <span style={{ color: C.onColor, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{stationShortName}</span>
          <Badges platform={platform} size={15} />
        </div>
        {!cameraActive && (
          <div
            style={{
              width: 110,
              height: 52,
              background: '#22262B',
              borderRadius: 8,
              borderTop: `6px solid ${C.greenSignal}`,
              animation: 'ml-ring 1.8s infinite',
            }}
          />
        )}
        <div
          style={{
            background: C.greenDeep,
            color: C.onColor,
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 999,
            padding: '4px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          This is your entrance
        </div>
      </div>

      <div style={{ position: 'absolute', left: '46%', bottom: 34, transform: 'translateX(-50%)', zIndex: 2 }}>
        <Chevrons size={36} thickness={10} rotate={headingOffset} />
      </div>

      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 3 }}>
        <Pill style={{ fontSize: 12.5 }}>{distanceFeet} ft ahead</Pill>
      </div>
      <button
        type="button"
        onClick={onToggleMap}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 3,
          border: 'none',
          background: 'rgba(255,255,255,.92)',
          color: C.body,
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 999,
          padding: '6px 12px',
          cursor: 'pointer',
        }}
      >
        {mapLabel}
      </button>
    </div>
  );
}

/** Illustrated station corridor. */
function CorridorArt() {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 52, background: '#6E7277' }} />
      <div style={{ position: 'absolute', top: 52, left: 0, right: 0, height: 96, background: '#DED8CB' }} />
      <div style={{ position: 'absolute', top: 110, left: 0, right: 0, height: 11, background: '#8A8477' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 116, background: '#AEB2B7' }} />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 230,
          height: 116,
          background: '#BFC3C8',
          clipPath: 'polygon(34% 0,66% 0,100% 100%,0 100%)',
        }}
      />
      <div style={{ position: 'absolute', top: 52, bottom: 104, left: 22, width: 24, background: '#9BA0A6' }} />
      <div style={{ position: 'absolute', top: 52, bottom: 104, right: 22, width: 24, background: '#9BA0A6' }} />
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: 26, background: '#3A3E44' }} />
    </>
  );
}

export function IndoorScene({
  step,
  platform,
  platformLabel,
  cameraActive,
  videoRef,
}: {
  step: NavStep;
  platform: Platform;
  platformLabel: string;
  cameraActive: boolean;
  videoRef: RefObject<HTMLVideoElement>;
}) {
  return (
    <div
      style={{
        position: 'relative',
        height: 264,
        background: '#CFC9BD',
        overflow: 'hidden',
        borderRadius: 16,
        margin: '10px 16px 0',
        flex: 'none',
      }}
    >
      <CameraLayer videoRef={videoRef} active={cameraActive} />
      {!cameraActive && <CorridorArt />}

      <div
        style={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: C.ink2,
          borderRadius: 6,
          padding: '8px 13px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 5px 12px rgba(0,0,0,.35)',
          whiteSpace: 'nowrap',
          zIndex: 2,
          maxWidth: 'calc(100% - 24px)',
        }}
      >
        <span style={{ color: C.onColor, fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {step.sign}
        </span>
        <Badges platform={platform} size={17} />
        {step.signArrow && <span style={{ color: C.onColor, fontSize: 15, fontWeight: 700 }}>{step.signArrow}</span>}
      </div>

      <div style={{ position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)', zIndex: 2 }}>
        <Chevrons size={38} thickness={11} rotate={step.rotation} />
      </div>

      {step.warning && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 10,
            background: 'rgba(181,71,8,.94)',
            color: C.onColor,
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 10,
            padding: '8px 12px',
            textAlign: 'center',
            zIndex: 3,
          }}
        >
          {step.warning}
        </div>
      )}

      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 3, display: 'flex' }}>
        <Pill style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          You need: {platformLabel}
        </Pill>
      </div>
    </div>
  );
}

export function CameraPrompt({
  status,
  onEnable,
  compact,
}: {
  status: 'idle' | 'asking' | 'ok' | 'denied' | 'unsupported';
  onEnable: () => void;
  compact?: boolean;
}) {
  if (status === 'ok') return null;
  const text =
    status === 'denied'
      ? 'Camera blocked — showing the illustrated view. Directions are unchanged.'
      : status === 'unsupported'
        ? 'No camera on this device — showing the illustrated view.'
        : status === 'asking'
          ? 'Waiting for camera permission…'
          : 'Turn on the camera for the AR view';
  const actionable = status === 'idle';
  return (
    <button
      type="button"
      onClick={actionable ? onEnable : undefined}
      style={{
        appearance: 'none',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        background: actionable ? C.brandTint : C.bgAlt,
        color: actionable ? C.brand : C.soft,
        borderRadius: 11,
        padding: compact ? '8px 11px' : '10px 12px',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: actionable ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span aria-hidden>{actionable ? '📷' : 'ℹ️'}</span>
      {text}
    </button>
  );
}
