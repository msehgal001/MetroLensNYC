# MetroLens

**Never miss your platform.** A working transit navigation app built from the
[MetroLens design](https://claude.ai/design/p/81820c7c-bc11-423d-a507-2687c5086d67?file=MetroLens.dc.html).

Most transit apps stop at the station door. MetroLens keeps going: it picks the right street
entrance, walks you through the corridors to the exact platform on the correct side, tells you
which train on that platform is yours and which one will take you the wrong way, which car to
ride so you land next to the transfer stairs, and which exit puts you on the right corner.

```bash
npm install
npm run dev        # http://127.0.0.1:5177
npm test           # engine tests
npm run build      # typecheck + production bundle
```

Open it on a phone for the full-screen layout; on a desktop it renders inside a device frame.
Dark mode follows your device (or force it in Profile → Appearance), haptics tick on every
tap where the device supports vibration, and the starting point is editable — tap the
location pill on Home, the From field in Search, or "change" on the route header.

---

## What is real, and what is simulated

The design file was a click-through prototype: two hardcoded trips and a screen index. This is
the product behind it — every number and instruction on screen is derived, not authored.

**Real:**

- **Routing.** Dijkstra over a graph of 157 stations and 21 lines, where a node is a rider
  waiting for a specific service in a specific direction on a specific platform. Express and
  local stopping patterns, in-station transfers, free-transfer complexes, walk-in and walk-out
  legs, service-period headways and alert-driven delays all fall out of the graph.
- **In-station guidance.** Generated from each platform's record — how deep it is, its layout,
  which way the corridor splits, which side the trains arrive on — so a three-level station
  produces more steps than a one-level one, and the same station always gives the same
  directions.
- **Decoy detection.** For every boarding platform, MetroLens works out which other lines stop
  there, which of them also reach your stop ("the D works too") and which do not ("the C is the
  Local — it does not stop at 72 St").
- **Preferences that change the answer.** The five route filters are five different weightings
  of the same search. Turning on *Elevator-only routes* re-plans immediately and can move you to
  a different station and a different line; the screen tells you what changed.
- **Alerts that mean something.** An alert applies only when both its line *and* its station
  intersect your trip, so a signal problem at Canal St stays quiet for an uptown rider. Each one
  is translated into what it means for your route, including which same-platform line is a
  usable backup.
- **Device sensors.** Geolocation drives the live distance and bearing to your entrance; the
  compass rotates the AR arrow and raises a wrong-way warning when your heading has been off for
  several seconds; the camera is the AR passthrough; voice and haptics use the Web Speech and
  Vibration APIs. Each degrades to a clearly-labelled fallback rather than pretending.

**Live, synced automatically (see Profile → Live data for current status):**

- **Arrivals are the real MTA GTFS-Realtime feeds**, read as JSON through Transiter's public
  NYC instance and refreshed every 30 seconds for the stations on screen. The dev/preview
  server proxies the request (`/live`, see vite.config.ts) because the upstream has no CORS;
  in production you host the same one-line rewrite. Every arrival row shows the train's real
  destination from the feed, and the board is tagged "Live — MTA GTFS-Realtime". If the feed
  is unreachable, the deterministic simulated timetable takes over and the tag says so.
- **Station registry & elevator status.** On startup the app fetches the official MTA Subway
  Stations dataset (data.ny.gov), matches our stations to GTFS ids by proximity + route
  overlap, and applies the real ADA flags — so step-free routing reflects the actual network.
  Cached for a week in localStorage.
- **Service alerts** try the MTA's official alerts JSON (`/mta` proxy). Where that host is
  unreachable the curated sample alerts remain, and the app says "sample alerts shown".

**Illustrative, and labelled as such in the app:**

- **Station geometry.** Entrance corners, corridor layouts and platform sides are
  illustrative: where not authored they are derived deterministically from the station id,
  so guidance is stable and self-consistent rather than random.
- **Indoor position.** A browser cannot locate you underground, so in-station progress advances
  when you tap a checkpoint or when auto-walk does it for you. There is no fake indoor
  positioning.

---

## Put it on your phone / host it

The app is a static build plus **two proxy rewrites** (`/live` → demo.transiter.dev,
`/mta` → api-endpoints.mta.info) that relay the MTA data, because the upstreams don't send
CORS headers. Camera, GPS and compass also require **HTTPS**. Both configs ship in the repo,
so any of these is one command:

**Vercel (easiest)**

```bash
npm i -g vercel
vercel --prod
```

`vercel.json` already declares the rewrites. You get an HTTPS URL — open it on your phone,
grant location + camera + motion when asked, and use Share → **Add to Home Screen** for the
full-screen app (manifest + icons are included).

**Netlify**

```bash
npm run build
npx netlify-cli deploy --prod --dir dist
```

`public/_redirects` (copied into `dist/`) carries the same proxy rules.

**Just your laptop + phone on the same Wi-Fi** (quick test, no account)

```bash
npm run dev -- --host
```

then open `http://<your-laptop-ip>:5177` on the phone. Live arrivals work (the dev server
does the proxying), but browsers only unlock camera/GPS/compass on HTTPS or localhost — so
for the sensor features use a hosted HTTPS URL, or tunnel with `npx untun tunnel http://localhost:5177`.

**Any other host** (Cloudflare Pages, nginx, S3+CDN): serve `dist/` and reproduce the two
rewrites from `vercel.json` on your edge.

---

## Layout

```
src/
  types.ts             domain types
  theme.ts             design tokens lifted from the design file
  data/
    stations.ts        157 stations: platforms, depths, layouts, entrances, ADA, crowding
    lines.ts           21 lines: stopping patterns, colors, terminals, headways, trunks
    network.ts         derived graph: geometry, platform lookup, ride times, validation
    places.ts          searchable destinations
    alerts.ts          service alerts
  engine/
    router.ts          route planner + itinerary construction
    indoor.ts          entrance → platform, transfer and exit guidance generation
    live.ts            live MTA layer: station matcher, GTFS-RT arrivals poller, alerts
    arrivals.ts        hybrid provider: live feed first, simulated fallback
    alerts.ts          "what it means for you"
    router.test.ts     routing, arrivals, guidance and alert-scoping tests
    live.test.ts       GTFS direction mapping, feed parsing, CSV matching tests
  state/
    store.tsx          reducer + context, localStorage persistence, the app clock
    prefs.ts           default preferences
  hooks/useSensors.ts  geolocation, compass, camera, voice, haptics, wrong-way watch
  lib/haptics.ts       app-wide haptic ticks (every tap) + confirm/alarm patterns
  components/          device frame, tab bar, AR scenes, UI primitives, error boundary
  screens/             all 22 screens from the design
```

Theming is a pair of CSS-variable palettes (`styles.css`); every token in `theme.ts` is a
`var(--ml-*)`, so light/dark/auto is a class on the device frame. MTA line colours never
change with the theme.

`validateNetwork()` runs as a test: every line stop must exist, appear once, and be served by a
platform that carries that line. It is the guard that keeps the dataset honest as it grows.

## The 22 screens

Splash · Onboarding · Home · Search · Route options · Pre-trip overview · Outdoor AR · Indoor
navigation (AR / Steps / Station map) · Wrong-way warning · Platform confirmation · Live arrivals
· Wrong-platform warning · Train confirmation · In-train progress · Transfer navigation · Second
platform · Exit guidance · I'm Lost · Trips · Alerts · Profile · Accessibility

Two changes from the design's screen flow, both because the product has real state where the
prototype had none: the design's "Demo:" links are now genuine rider actions ("This doesn't look
right", "The signs here don't say …"), and the transfer → second-platform pair generalises to any
number of legs instead of exactly two.
