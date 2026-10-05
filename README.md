# MetroLens NYC

Platform-level subway navigation: plan a trip, compare routes, and follow a station-by-station journey.

**[Open the live app](https://metro-lens-nyc.vercel.app/)**

## What it demonstrates

- Graph-based routing across 157 stations and 21 lines, with express/local patterns and transfer costs.
- Route preferences, including step-free access, that change the suggested journey.
- Live arrival integration with explicitly labelled simulated fallbacks.
- Mobile-first navigation, camera overlays, geolocation, voice, and haptic feedback where supported.
- A tested TypeScript routing engine and a deployable React application.

## Data and limitations

Arrival data comes from the public Transiter NYC service, which relays MTA GTFS-Realtime feeds. Station accessibility data is synchronized from the MTA dataset, while service alerts fall back to labelled samples if the upstream feed is unavailable.

Station entrances, corridor geometry, platform sides, and car-position guidance are illustrative. Indoor progress uses checkpoints rather than indoor positioning. Treat this as an interactive product demonstration; confirm real travel and accessibility details with the transit operator.

## Run locally

Requires Node.js 22.12+ (Node.js 24 recommended).

```bash
npm ci
npm run dev
```

```bash
npm test
npm run build
```

## Deploy

The existing Vercel deployment builds with `npm run build` and serves `dist`. `vercel.json` defines the `/live` and `/mta` proxy rewrites needed by the transit integrations. HTTPS is required for camera, location, and device orientation features.

## Source guide

| Path | Responsibility |
| --- | --- |
| `src/engine/` | Routing, station graph, and journey logic |
| `src/data/` | Station and service data |
| `src/screens/` | Mobile application screens |
| `src/engine/live.ts` · `src/hooks/` | Live feeds and device integrations |
| `vercel.json` | Production transit-feed rewrites |

**React · TypeScript · Vite · Vitest**

Built by [Madhav Sehgal](https://msehgal.net).
