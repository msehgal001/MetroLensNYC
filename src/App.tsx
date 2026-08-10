import { useEffect } from 'react';
import { AppProvider, useApp } from './state/store';
import { Phone } from './components/Phone';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Onboarding, Splash } from './screens/Intro';
import { Home } from './screens/Home';
import { Search } from './screens/Search';
import { RouteOptions } from './screens/RouteOptions';
import { PreTrip } from './screens/PreTrip';
import { IndoorNav, OutdoorAR, WrongWay } from './screens/Navigate';
import { ArrivalsScreen, PlatformConfirm, SecondPlatform, WrongPlatform } from './screens/Platform';
import { ExitScreen, InTrain, TrainConfirm, TransferScreen } from './screens/Ride';
import { Lost } from './screens/Lost';
import { AccessibilitySettings, AlertsScreen, Profile, Trips } from './screens/Library';
import { useGeolocation } from './hooks/useSensors';
import { stationsNear } from './engine/shared';
import { live } from './engine/live';
import { currentRide } from './state/store';

/**
 * Feeds the real device location into the store, and re-plans the current trip when the
 * rider has moved far enough for the nearest entrance to have changed.
 */
function LocationBridge() {
  const { state, dispatch } = useApp();
  const { fix, status } = useGeolocation(state.onboarded || state.screen !== 'splash');

  useEffect(() => {
    dispatch({ type: 'geo', geo: { status: status === 'ok' ? 'ok' : status } });
  }, [status, dispatch]);

  useEffect(() => {
    if (!fix) return;
    const near = stationsNear(fix.lat, fix.lon, { limit: 1, maxMeters: 4000 })[0];
    dispatch({
      type: 'set-origin',
      accuracy: fix.accuracy,
      origin: {
        id: 'origin-current',
        name: 'Current location',
        category: 'saved',
        lat: fix.lat,
        lon: fix.lon,
        address: near
          ? `${Math.max(1, Math.round(near.walkSeconds / 60))} min from ${near.station.shortName}`
          : 'Outside the covered network',
      },
    });
  }, [fix, dispatch]);

  return null;
}

/**
 * Drives the live MTA layer: loads the official station registry (and its real ADA
 * flags), polls arrivals for the stations currently on screen, and refreshes live
 * service alerts — falling back to the labeled samples when the feed is unreachable.
 */
function LiveBridge() {
  const { state, dispatch } = useApp();

  // Registry + alerts on startup, alerts refreshed every 2 minutes while they work.
  useEffect(() => {
    let cancelled = false;
    void live.ensureRegistry();
    const pull = async () => {
      const alerts = await live.refreshAlerts();
      if (!cancelled && alerts) dispatch({ type: 'set-alerts', alerts, live: true });
    };
    void pull();
    const id = window.setInterval(() => {
      if (live.alertsStatus !== 'offline') void pull();
    }, 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [dispatch]);

  // Poll arrivals for whichever stations matter right now.
  const trip = state.trip;
  const watchIds = [
    trip ? currentRide(trip).platform.stationId : null,
    trip?.itinerary.exitStation.id ?? null,
    !trip && state.routes[0] ? state.routes[0].entryStation.id : null,
    stationsNear(state.origin.lat, state.origin.lon, { limit: 1, maxMeters: 1600 })[0]?.station.id ?? null,
  ].filter((x): x is string => !!x);
  const watchKey = [...new Set(watchIds)].sort().join('|');

  useEffect(() => {
    const ids = watchKey.split('|').filter(Boolean);
    for (const id of ids) live.watch(id);
    return () => {
      for (const id of ids) live.unwatch(id);
    };
  }, [watchKey]);

  return null;
}

function CurrentScreen() {
  const { state } = useApp();
  switch (state.screen) {
    case 'splash':
      return <Splash />;
    case 'onb':
      return <Onboarding />;
    case 'home':
      return <Home />;
    case 'search':
      return <Search />;
    case 'routes':
      return <RouteOptions />;
    case 'pretrip':
      return <PreTrip />;
    case 'outdoor':
      return <OutdoorAR />;
    case 'indoor':
      return <IndoorNav />;
    case 'wrongway':
      return <WrongWay />;
    case 'platform':
      return <PlatformConfirm />;
    case 'platform2':
      return <SecondPlatform />;
    case 'arrivals':
      return <ArrivalsScreen />;
    case 'wrong':
      return <WrongPlatform />;
    case 'train':
      return <TrainConfirm />;
    case 'intrain':
      return <InTrain />;
    case 'transfer':
      return <TransferScreen />;
    case 'exit':
      return <ExitScreen />;
    case 'lost':
      return <Lost />;
    case 'trips':
      return <Trips />;
    case 'alerts':
      return <AlertsScreen />;
    case 'profile':
      return <Profile />;
    case 'access':
      return <AccessibilitySettings />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <LocationBridge />
      <LiveBridge />
      <Phone>
        <ErrorBoundary>
          <CurrentScreen />
        </ErrorBoundary>
      </Phone>
    </AppProvider>
  );
}
