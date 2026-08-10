/**
 * App-wide haptics. UI primitives call `tap()` on every press; screens fire richer
 * patterns for arrivals, wrong turns and confirmations. A module-level switch mirrors
 * the rider's preference so deep components don't need the store.
 */

let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function buzz(pattern: number | number[] = 12) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported — silently skip */
  }
}

/** Light tick for ordinary taps. */
export function tap() {
  buzz(10);
}

/** Positive confirmation (right platform, right train). */
export function confirm() {
  buzz([30, 40, 30]);
}

/** Attention pattern (wrong way, wrong platform). */
export function alarm() {
  buzz([80, 60, 80, 60, 120]);
}
