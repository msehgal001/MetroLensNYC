/**
 * Single source of truth for the app: which screen is showing, the planned trip, how far
 * along it the rider is, their saved places and preferences, and the ticking clock that
 * drives live arrivals.
 *
 * Everything the rider can change is persisted to localStorage, so closing the tab
 * mid-trip and coming back resumes where they left off.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type {
  Itinerary,
  Place,
  Preferences,
  RideLeg,
  RouteProfileId,
  SavedPlace,
  ServiceAlert,
  TransferLeg,
} from '../types';
import { ALERTS } from '../data/alerts';
import { DEFAULT_ORIGIN } from '../data/places';
import { planRoutes } from '../engine/router';
import { defaultPreferences } from './prefs';
import { setHapticsEnabled } from '../lib/haptics';

export type Screen =
  | 'splash' | 'onb' | 'home' | 'search' | 'routes' | 'pretrip' | 'outdoor' | 'indoor'
  | 'platform' | 'arrivals' | 'wrong' | 'wrongway' | 'train' | 'intrain' | 'transfer'
  | 'platform2' | 'exit' | 'lost' | 'trips' | 'alerts' | 'profile' | 'access';

export type NavMode = 'ar' | 'list' | 'map';

export interface TripProgress {
  itinerary: Itinerary;
  /** Index into the itinerary's ride legs. */
  legIndex: number;
  /** Index into the current in-station step list. */
  stepIndex: number;
  /** Stops completed on the current ride leg. */
  stopIndex: number;
  transferStepIndex: number;
  startedAt: number;
  platformArrivedAt: number | null;
  boardedAt: number | null;
}

export interface PlannedTrip {
  id: string;
  destination: Place;
  itinerary: Itinerary;
  savedAt: number;
}

export interface RecentTrip {
  id: string;
  from: string;
  to: string;
  platform: string;
  minutes: number;
  at: number;
}

export interface AppState {
  screen: Screen;
  returnTo: Screen;
  /** Which field the Search screen should focus when opened. */
  searchIntent: 'origin' | 'destination';
  /** True once the rider has picked a starting point by hand — geolocation stops overriding it. */
  originLocked: boolean;
  /** True when state.alerts came from the live MTA feed rather than the curated samples. */
  alertsLive: boolean;
  onboarded: boolean;
  obIndex: number;
  origin: Place;
  query: string;
  destination: Place | null;
  routes: Itinerary[];
  routeFilter: RouteProfileId;
  selectedRouteId: string | null;
  trip: TripProgress | null;
  mode: NavMode;
  prefs: Preferences;
  saved: SavedPlace[];
  planned: PlannedTrip[];
  recent: RecentTrip[];
  alerts: ServiceAlert[];
  /** Wall clock, ticked once a second, so arrivals count down. */
  now: number;
  geo: { status: 'idle' | 'asking' | 'ok' | 'denied' | 'unsupported'; accuracy?: number; error?: string };
  heading: number | null;
  camera: 'off' | 'asking' | 'on' | 'denied' | 'unsupported';
  toast: string | null;
}

type Action =
  | { type: 'tick'; now: number }
  | { type: 'go'; screen: Screen }
  | { type: 'onboard-next' }
  | { type: 'onboard-skip' }
  | { type: 'query'; value: string }
  | { type: 'plan'; destination: Place; routes: Itinerary[] }
  | { type: 'set-routes'; routes: Itinerary[] }
  | { type: 'route-filter'; profile: RouteProfileId }
  | { type: 'select-route'; id: string }
  | { type: 'start-trip'; itinerary: Itinerary }
  | { type: 'set-mode'; mode: NavMode }
  | { type: 'step'; delta: number }
  | { type: 'goto-step'; index: number }
  | { type: 'arrive-platform' }
  | { type: 'board' }
  | { type: 'next-stop' }
  | { type: 'transfer-step'; delta: number }
  | { type: 'next-leg' }
  | { type: 'end-trip'; completed: boolean }
  | { type: 'toggle-pref'; key: keyof Preferences }
  | { type: 'set-pref'; key: keyof Preferences; value: Preferences[keyof Preferences] }
  | { type: 'save-trip' }
  | { type: 'save-place'; place: SavedPlace }
  | { type: 'remove-planned'; id: string }
  | { type: 'set-origin'; origin: Place; accuracy?: number }
  | { type: 'choose-origin'; place: Place }
  | { type: 'use-current-location' }
  | { type: 'open-search'; intent: 'origin' | 'destination' }
  | { type: 'set-alerts'; alerts: ServiceAlert[]; live: boolean }
  | { type: 'geo'; geo: AppState['geo'] }
  | { type: 'heading'; heading: number | null }
  | { type: 'camera'; camera: AppState['camera'] }
  | { type: 'toast'; message: string | null }
  | { type: 'restore'; state: Partial<AppState> };

const STORAGE_KEY = 'metrolens.v1';

const DEFAULT_SAVED: SavedPlace[] = [
  { id: 'saved-home', label: 'Home', dot: '#1264E3', name: 'Home', address: 'Ann Arbor, MI', category: 'saved', lat: 42.2808, lon: -83.743 },
  { id: 'saved-hotel', label: 'Hotel', dot: '#F79009', name: 'Hotel', address: 'W 35th St, Midtown', category: 'saved', lat: 40.7509, lon: -73.9895 },
  { id: 'saved-work', label: 'Work', dot: '#7A5AF8', name: 'Work', address: 'Add address', category: 'saved', lat: 0, lon: 0 },
];

function initialState(): AppState {
  return {
    screen: 'splash',
    returnTo: 'home',
    searchIntent: 'destination',
    originLocked: false,
    alertsLive: false,
    onboarded: false,
    obIndex: 0,
    origin: DEFAULT_ORIGIN,
    query: '',
    destination: null,
    routes: [],
    routeFilter: defaultPreferences().defaultProfile,
    selectedRouteId: null,
    trip: null,
    mode: 'ar',
    prefs: defaultPreferences(),
    saved: DEFAULT_SAVED,
    planned: [],
    recent: [
      { id: 'r1', from: 'Hotel', to: 'Times Sq–42 St', platform: 'Uptown N·Q·R·W platform', minutes: 11, at: Date.now() - 864e5 },
      { id: 'r2', from: 'MoMA', to: 'Hotel', platform: 'Downtown E platform', minutes: 16, at: Date.now() - 3 * 864e5 },
    ],
    alerts: ALERTS,
    now: Date.now(),
    geo: { status: 'idle' },
    heading: null,
    camera: 'off',
    toast: null,
  };
}

/** Ride legs of the trip, in order. */
export function rideLegsOf(t: TripProgress): RideLeg[] {
  return t.itinerary.legs.filter((l): l is RideLeg => l.type === 'ride');
}

export function transferLegsOf(t: TripProgress): TransferLeg[] {
  return t.itinerary.legs.filter((l): l is TransferLeg => l.type === 'transfer');
}

export function currentRide(t: TripProgress): RideLeg {
  const rides = rideLegsOf(t);
  return rides[Math.min(t.legIndex, rides.length - 1)];
}

export function currentTransfer(t: TripProgress): TransferLeg | null {
  return transferLegsOf(t)[t.legIndex - 1] ?? null;
}

/** In-station steps for the current phase: entry for leg 0, transfer steps after. */
export function currentSteps(t: TripProgress) {
  if (t.legIndex === 0) return t.itinerary.indoorSteps;
  return currentTransfer(t)?.steps ?? t.itinerary.indoorSteps;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'tick':
      return { ...state, now: action.now };

    case 'go': {
      if (action.screen === state.screen) return state;
      const returnTo = action.screen === 'lost' ? state.screen : state.returnTo;
      const next: AppState = { ...state, screen: action.screen, returnTo };
      if (action.screen === 'platform' || action.screen === 'platform2' || action.screen === 'arrivals') {
        if (state.trip && state.trip.platformArrivedAt == null) {
          next.trip = { ...state.trip, platformArrivedAt: state.now };
        }
      }
      return next;
    }

    case 'onboard-next':
      return state.obIndex >= 2
        ? { ...state, screen: 'home', onboarded: true, obIndex: 0 }
        : { ...state, obIndex: state.obIndex + 1 };

    case 'onboard-skip':
      return { ...state, screen: 'home', onboarded: true, obIndex: 0 };

    case 'query':
      return { ...state, query: action.value };

    case 'plan':
      return {
        ...state,
        destination: action.destination,
        routes: action.routes,
        selectedRouteId: action.routes[0]?.id ?? null,
        screen: 'routes',
      };

    case 'set-routes': {
      // Re-planned in place (e.g. after a preference change) — stay on the current screen.
      const keep = action.routes.find((r) => r.id === state.selectedRouteId);
      return {
        ...state,
        routes: action.routes,
        selectedRouteId: (keep ?? action.routes[0])?.id ?? null,
      };
    }

    case 'route-filter': {
      const match = state.routes.find((r) => r.profile === action.profile);
      return { ...state, routeFilter: action.profile, selectedRouteId: match?.id ?? state.selectedRouteId };
    }

    case 'select-route':
      return { ...state, selectedRouteId: action.id };

    case 'start-trip':
      return {
        ...state,
        screen: 'pretrip',
        selectedRouteId: action.itinerary.id,
        destination: action.itinerary.destination,
        trip: {
          itinerary: action.itinerary,
          legIndex: 0,
          stepIndex: 0,
          stopIndex: 0,
          transferStepIndex: 0,
          startedAt: state.now,
          platformArrivedAt: null,
          boardedAt: null,
        },
      };

    case 'set-mode':
      return { ...state, mode: action.mode };

    case 'step': {
      if (!state.trip) return state;
      const steps = currentSteps(state.trip);
      const index = Math.min(Math.max(0, state.trip.stepIndex + action.delta), steps.length - 1);
      return { ...state, trip: { ...state.trip, stepIndex: index } };
    }

    case 'goto-step': {
      if (!state.trip) return state;
      const steps = currentSteps(state.trip);
      return {
        ...state,
        trip: { ...state.trip, stepIndex: Math.min(Math.max(0, action.index), steps.length - 1) },
      };
    }

    case 'arrive-platform': {
      if (!state.trip) return state;
      return {
        ...state,
        screen: state.trip.legIndex === 0 ? 'platform' : 'platform2',
        trip: { ...state.trip, platformArrivedAt: state.trip.platformArrivedAt ?? state.now },
      };
    }

    case 'board':
      if (!state.trip) return state;
      return {
        ...state,
        screen: 'intrain',
        trip: { ...state.trip, boardedAt: state.now, stopIndex: 0 },
      };

    case 'next-stop': {
      if (!state.trip) return state;
      const ride = currentRide(state.trip);
      const remaining = ride.stops.length - 1 - state.trip.stopIndex;
      if (remaining > 0) {
        return { ...state, trip: { ...state.trip, stopIndex: state.trip.stopIndex + 1 } };
      }
      const rides = rideLegsOf(state.trip);
      if (state.trip.legIndex < rides.length - 1) {
        return {
          ...state,
          screen: 'transfer',
          trip: { ...state.trip, legIndex: state.trip.legIndex + 1, transferStepIndex: 0, stepIndex: 0, platformArrivedAt: null, boardedAt: null },
        };
      }
      return { ...state, screen: 'exit' };
    }

    case 'transfer-step': {
      if (!state.trip) return state;
      const t = currentTransfer(state.trip);
      const len = t?.steps.length ?? 1;
      const index = Math.min(Math.max(0, state.trip.transferStepIndex + action.delta), len - 1);
      return { ...state, trip: { ...state.trip, transferStepIndex: index } };
    }

    case 'next-leg': {
      if (!state.trip) return state;
      return { ...state, screen: 'platform2', trip: { ...state.trip, platformArrivedAt: state.now } };
    }

    case 'end-trip': {
      const trip = state.trip;
      const recent: RecentTrip[] = trip && action.completed
        ? [
            {
              id: `r-${trip.startedAt}`,
              from: trip.itinerary.origin.name,
              to: trip.itinerary.destination.name,
              platform: `${trip.itinerary.firstRide.direction.word} ${trip.itinerary.firstRide.platform.lines.join('·')} platform`,
              minutes: Math.max(1, Math.round((state.now - trip.startedAt) / 60000)) || Math.round(trip.itinerary.seconds / 60),
              at: state.now,
            },
            ...state.recent,
          ].slice(0, 8)
        : state.recent;
      return {
        ...state,
        screen: 'home',
        trip: null,
        mode: 'ar',
        recent,
        planned: trip && action.completed ? state.planned.filter((p) => p.itinerary.id !== trip.itinerary.id) : state.planned,
      };
    }

    case 'toggle-pref': {
      const key = action.key;
      const value = state.prefs[key];
      if (typeof value !== 'boolean') return state;
      return { ...state, prefs: { ...state.prefs, [key]: !value } };
    }

    case 'set-pref':
      return { ...state, prefs: { ...state.prefs, [action.key]: action.value } };

    case 'save-trip': {
      const it = state.routes.find((r) => r.id === state.selectedRouteId) ?? state.trip?.itinerary;
      if (!it) return state;
      if (state.planned.some((p) => p.itinerary.id === it.id)) {
        return { ...state, toast: 'Already saved to Trips' };
      }
      return {
        ...state,
        planned: [{ id: `p-${it.id}`, destination: it.destination, itinerary: it, savedAt: state.now }, ...state.planned].slice(0, 6),
        toast: 'Saved to Trips',
      };
    }

    case 'save-place':
      return { ...state, saved: [...state.saved.filter((s) => s.id !== action.place.id), action.place] };

    case 'remove-planned':
      return { ...state, planned: state.planned.filter((p) => p.id !== action.id) };

    case 'set-origin': {
      // Only a real fix (it carries accuracy) may claim geolocation is working.
      const geo = action.accuracy != null ? ({ status: 'ok', accuracy: action.accuracy } as const) : state.geo;
      // A geolocation fix never overrides a starting point the rider chose by hand.
      if (state.originLocked) return { ...state, geo };
      return { ...state, origin: action.origin, geo };
    }

    case 'choose-origin':
      return { ...state, origin: action.place, originLocked: true };

    case 'use-current-location':
      return { ...state, originLocked: false, geo: { ...state.geo } };

    case 'open-search':
      return { ...state, screen: 'search', searchIntent: action.intent };

    case 'set-alerts':
      return { ...state, alerts: action.alerts, alertsLive: action.live };

    case 'geo':
      return { ...state, geo: action.geo };

    case 'heading':
      return { ...state, heading: action.heading };

    case 'camera':
      return { ...state, camera: action.camera };

    case 'toast':
      return { ...state, toast: action.message };

    case 'restore':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

interface Persisted {
  onboarded: boolean;
  prefs: Preferences;
  saved: SavedPlace[];
  recent: RecentTrip[];
  routeFilter: RouteProfileId;
}

function load(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      onboarded: !!p.onboarded,
      prefs: { ...defaultPreferences(), ...(p.prefs ?? {}) },
      saved: p.saved?.length ? p.saved : DEFAULT_SAVED,
      recent: p.recent ?? undefined,
      routeFilter: p.routeFilter ?? p.prefs?.defaultProfile ?? 'fastest',
    } as Partial<AppState>;
  } catch {
    return null;
  }
}

function save(state: AppState) {
  try {
    const p: Persisted = {
      onboarded: state.onboarded,
      prefs: state.prefs,
      saved: state.saved,
      recent: state.recent,
      routeFilter: state.routeFilter,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — the app still works, it just will not remember */
  }
}

interface Api {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  go(screen: Screen): void;
  /** Plan a trip to `place` and show the route options. */
  planTo(place: Place, profile?: RouteProfileId): Itinerary[];
  /** Re-plan the currently selected destination, e.g. after preferences change. */
  replan(): void;
  selectedRoute: Itinerary | null;
  nowDate: Date;
}

const Ctx = createContext<Api | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const base = initialState();
    const restored = load();
    return restored ? { ...base, ...restored } : base;
  });

  // One clock for the whole app.
  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    save(state);
  }, [state.onboarded, state.prefs, state.saved, state.recent, state.routeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHapticsEnabled(state.prefs.haptic);
  }, [state.prefs.haptic]);

  useEffect(() => {
    if (!state.toast) return;
    const id = window.setTimeout(() => dispatch({ type: 'toast', message: null }), 2200);
    return () => window.clearTimeout(id);
  }, [state.toast]);

  const go = useCallback((screen: Screen) => dispatch({ type: 'go', screen }), []);

  const planTo = useCallback(
    (place: Place) => {
      const routes = planRoutes({
        origin: state.origin,
        destination: place,
        at: new Date(state.now),
        prefs: state.prefs,
        alerts: state.alerts,
      });
      dispatch({ type: 'plan', destination: place, routes });
      return routes;
    },
    [state.origin, state.now, state.prefs, state.alerts],
  );

  const replan = useCallback(() => {
    if (!state.destination) return;
    const routes = planRoutes({
      origin: state.origin,
      destination: state.destination,
      at: new Date(state.now),
      prefs: state.prefs,
      alerts: state.alerts,
    });
    dispatch({ type: 'set-routes', routes });
  }, [state.destination, state.origin, state.now, state.prefs, state.alerts]);

  // Any preference that changes routing re-plans the current destination immediately, so
  // the Accessibility screen's toggles are felt before the rider goes back to the route list.
  const { avoidStairs, elevatorOnly, accessibleEntrances, fewerTransfers, walkingTolerance, maxTransfers, defaultProfile } =
    state.prefs;
  const destinationId = state.destination?.id;
  const originKey = `${state.origin.id}:${state.origin.lat.toFixed(4)},${state.origin.lon.toFixed(4)}`;
  useEffect(() => {
    if (!destinationId) return;
    replan();
    // `replan` is intentionally omitted: it changes every tick with the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    destinationId,
    originKey,
    avoidStairs,
    elevatorOnly,
    accessibleEntrances,
    fewerTransfers,
    walkingTolerance,
    maxTransfers,
    defaultProfile,
  ]);

  const selectedRoute = useMemo(
    () => state.routes.find((r) => r.id === state.selectedRouteId) ?? state.routes[0] ?? null,
    [state.routes, state.selectedRouteId],
  );

  const api = useMemo<Api>(
    () => ({ state, dispatch, go, planTo, replan, selectedRoute, nowDate: new Date(state.now) }),
    [state, go, planTo, replan, selectedRoute],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApp(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
