import type { Preferences } from '../types';

export function defaultPreferences(): Preferences {
  return {
    theme: 'system',
    avoidStairs: false,
    elevatorOnly: false,
    fewerTransfers: false,
    accessibleEntrances: false,
    voice: true,
    haptic: true,
    largeText: false,
    highContrast: false,
    autoAdvance: true,
    defaultProfile: 'simplest-platforms',
    walkingTolerance: 10,
    maxTransfers: 1,
  };
}
