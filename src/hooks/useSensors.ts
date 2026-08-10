/**
 * Real device sensors, with honest fallbacks.
 *
 * - Geolocation gives the outdoor leg a real distance and bearing to the entrance.
 * - Device orientation gives the AR arrow a real heading, and lets MetroLens notice when
 *   the rider is walking the wrong way down a corridor.
 * - The camera is the AR passthrough. When it is unavailable the app draws the illustrated
 *   scene instead — it never pretends to see something it cannot.
 *
 * A browser cannot position a rider underground, so in-station progress is advanced by the
 * rider (or by the auto-walk timer), not by fake indoor positioning.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { buzz } from '../lib/haptics';

export interface GeoFix {
  lat: number;
  lon: number;
  accuracy: number;
  at: number;
}

export type PermissionState = 'idle' | 'asking' | 'ok' | 'denied' | 'unsupported';

export function useGeolocation(enabled: boolean) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [status, setStatus] = useState<PermissionState>('idle');

  useEffect(() => {
    if (!enabled) return;
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    setStatus('asking');
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('ok');
        setFix({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: pos.timestamp,
        });
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return { fix, status };
}

interface OrientationEventish extends Event {
  alpha: number | null;
  webkitCompassHeading?: number;
}

export function useHeading(enabled: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [status, setStatus] = useState<PermissionState>('idle');

  const request = useCallback(async () => {
    const Ctor = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
    }).DeviceOrientationEvent;
    if (!Ctor) {
      setStatus('unsupported');
      return false;
    }
    if (typeof Ctor.requestPermission === 'function') {
      setStatus('asking');
      try {
        const r = await Ctor.requestPermission();
        setStatus(r === 'granted' ? 'ok' : 'denied');
        return r === 'granted';
      } catch {
        setStatus('denied');
        return false;
      }
    }
    setStatus('ok');
    return true;
  }, []);

  useEffect(() => {
    if (!enabled || status === 'denied' || status === 'unsupported') return;
    const onOrient = (raw: Event) => {
      const e = raw as OrientationEventish;
      const compass = e.webkitCompassHeading;
      if (typeof compass === 'number' && !Number.isNaN(compass)) {
        setHeading(compass);
        setStatus('ok');
      } else if (e.alpha != null) {
        setHeading((360 - e.alpha) % 360);
        setStatus('ok');
      }
    };
    window.addEventListener('deviceorientationabsolute', onOrient as EventListener, true);
    window.addEventListener('deviceorientation', onOrient as EventListener, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient as EventListener, true);
      window.removeEventListener('deviceorientation', onOrient as EventListener, true);
    };
  }, [enabled, status]);

  return { heading, status, request };
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<PermissionState>('idle');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    setStatus('asking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus('ok');
    } catch {
      setStatus('denied');
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, status, start, stop };
}

/** Speaks a step aloud when voice guidance is on. Silent if the browser cannot. */
export function useVoice(enabled: boolean) {
  const lastRef = useRef<string>('');
  return useCallback(
    (text: string) => {
      if (!enabled || !text || text === lastRef.current) return;
      lastRef.current = text;
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
      } catch {
        /* speech unavailable */
      }
    },
    [enabled],
  );
}

/** Short vibration at each turn, when haptics are on and supported. */
export function useHaptic(enabled: boolean) {
  return useCallback(
    (pattern: number | number[] = 30) => {
      if (!enabled) return;
      buzz(pattern);
    },
    [enabled],
  );
}

/**
 * Watches the compass against the heading the rider should be facing. Reports a wrong
 * turn only after the deviation has persisted, so a glance over the shoulder is ignored.
 */
export function useWrongWayWatch(
  expectedHeading: number | null | undefined,
  heading: number | null,
  onWrongWay: () => void,
  opts: { toleranceDeg?: number; holdMs?: number; enabled?: boolean } = {},
) {
  const { toleranceDeg = 110, holdMs = 4000, enabled = true } = opts;
  const sinceRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled || expectedHeading == null || heading == null) {
      sinceRef.current = null;
      return;
    }
    const diff = Math.abs(((heading - expectedHeading + 540) % 360) - 180);
    if (diff > toleranceDeg) {
      if (sinceRef.current == null) sinceRef.current = Date.now();
      else if (!firedRef.current && Date.now() - sinceRef.current > holdMs) {
        firedRef.current = true;
        onWrongWay();
      }
    } else {
      sinceRef.current = null;
      firedRef.current = false;
    }
  }, [enabled, expectedHeading, heading, toleranceDeg, holdMs, onWrongWay]);
}
