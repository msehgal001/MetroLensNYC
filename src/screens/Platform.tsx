import { useEffect, useMemo } from 'react';
import { currentRide, currentTransfer, rideLegsOf, useApp } from '../state/store';
import { BackBtn, Badges, Banner, Btn, Bullet, Card, Chevrons, GreenHeader, KV, Scroll } from '../components/ui';
import { C, R, SHADOW } from '../theme';
import { LINE_BY_ID, STATION_BY_ID, linesServing, platformSide } from '../engine/shared';
import { arrivalServes, arrivals, etaLabel } from '../engine/arrivals';
import { arrivalsSourceLabel } from '../engine/live';
import { oppositeDirWord } from '../engine/router';
import { turnAroundSteps } from '../engine/indoor';
import { useHaptic, useVoice } from '../hooks/useSensors';
import type { Arrival, RideLeg } from '../types';

/** Which car to stand by, drawn as an 8-segment train. */
function BoardingDiagram({ car, cars }: { car: 'front' | 'middle' | 'rear'; cars: number }) {
  const n = Math.min(11, Math.max(5, cars));
  const lit = new Set<number>();
  if (car === 'front') [0, 1].forEach((i) => lit.add(i));
  else if (car === 'rear') [n - 2, n - 1].forEach((i) => lit.add(i));
  else [Math.floor(n / 2) - 1, Math.floor(n / 2)].forEach((i) => lit.add(i));
  return (
    <>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            style={{ flex: 1, height: 26, borderRadius: 5, background: lit.has(i) ? C.brand : C.hair }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.faint, marginTop: 5, fontWeight: 600 }}>
        <span>FRONT</span>
        <span>REAR</span>
      </div>
    </>
  );
}

function useLiveArrivals(stationId: string, trunk: string, dir: 'A' | 'B', nowMs: number, alerts = true) {
  const { state } = useApp();
  return useMemo(
    () =>
      arrivals.at({
        stationId,
        trunk,
        dir,
        now: new Date(nowMs),
        alerts: alerts ? state.alerts : [],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stationId, trunk, dir, nowMs, alerts, state.alerts],
  );
}

function ArrivalRow({
  a,
  isMine,
  serves,
}: {
  a: Arrival;
  isMine: boolean;
  serves: boolean;
}) {
  const soon = a.eta <= 30;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 15px', borderBottom: `1px solid ${C.line3}` }}>
      <Bullet line={a.line} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: isMine ? 700 : 600 }}>
          {a.lineName}
          {isMine && <span style={{ color: C.greenDeep, fontSize: 11.5, fontWeight: 700 }}> · Your train</span>}
        </div>
        <div
          style={{
            fontSize: 12,
            color: isMine ? C.greenDeep : serves ? C.soft : C.red,
            fontWeight: 600,
            marginTop: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isMine
            ? `Your train — toward ${a.toward}`
            : serves
              ? `Also OK — toward ${a.toward}`
              : `Do not board — toward ${a.toward}`}
          {a.status === 'delayed' ? ' · delayed' : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: isMine ? (soon ? C.red : C.brand) : C.body }}>
          {etaLabel(a.eta, isMine)}
        </div>
        <div style={{ fontSize: 10.5, color: C.faint, fontWeight: 600 }}>{a.cars} cars</div>
      </div>
    </div>
  );
}

/** Tells the rider whether this board is the real feed or the simulation. */
function SourceTag({ stationId, now }: { stationId: string; now: number }) {
  const src = arrivalsSourceLabel(stationId, now);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.faint, marginTop: 10 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: src.live ? C.green : C.faint,
          animation: src.live ? 'ml-pulse 1.6s infinite' : undefined,
          flex: 'none',
        }}
      />
      {src.label}
    </div>
  );
}

function PlatformBody({ ride, second }: { ride: RideLeg; second: boolean }) {
  const { state, go, dispatch } = useApp();
  const trip = state.trip!;
  const station = STATION_BY_ID[ride.platform.stationId];
  const lines = linesServing(ride.platform, station.id);
  const side = platformSide(ride.platform, ride.dir);
  const list = useLiveArrivals(station.id, ride.platform.trunk, ride.dir, state.now);
  const mine = list.filter((a) => a.line === ride.line);
  const speak = useVoice(state.prefs.voice);
  const buzz = useHaptic(state.prefs.haptic);

  useEffect(() => {
    speak(`You are on the correct platform. ${ride.direction.word} ${lines.join(' ')}. Your ${ride.lineName} arrives on the ${side} side.`);
    buzz([30, 40, 30]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride.platform.id]);

  const next = mine[0];
  const arriving = next ? next.eta <= 45 : false;

  return (
    <>
      <GreenHeader>
        {second ? `Correct platform — ${ride.direction.word} ${ride.line}` : 'You’re on the correct platform'}
      </GreenHeader>
      <Scroll pad="13px 16px 90px" gap={11}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 19, fontWeight: 800 }}>{ride.direction.word} Platform</span>
            <Badges platform={ride.platform} stationId={station.id} size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, marginTop: 12 }}>
            <KV label="Station">{station.name} · {ride.platform.level}</KV>
            <KV label="Direction">
              <span style={{ fontWeight: 600 }}>{ride.direction.long}</span>
            </KV>
            <KV label="Train">
              <span style={{ fontWeight: 600 }}>
                {ride.lineName} toward {ride.toward}
              </span>
            </KV>
            <KV label="Platform side">
              <span style={{ fontWeight: 600 }}>Trains arrive on the {side} side</span>
            </KV>
            <KV label="Confirm it">Overhead signs read “{ride.direction.sign}”.</KV>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Next arrivals</span>
            <button
              type="button"
              onClick={() => go('arrivals')}
              style={{ appearance: 'none', border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: C.brand, cursor: 'pointer' }}
            >
              See all →
            </button>
          </div>
          <div style={{ margin: '0 -16px' }}>
            {list.slice(0, 3).map((a) => (
              <ArrivalRow
                key={a.id}
                a={a}
                isMine={a.line === ride.line}
                serves={arrivalServes(a, ride.toStation)}
              />
            ))}
            {!list.length && (
              <div style={{ padding: '12px 16px', fontSize: 13, color: C.soft }}>
                No trains scheduled on this platform right now.
              </div>
            )}
          </div>
          <SourceTag stationId={station.id} now={state.now} />
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Where to stand</div>
          <BoardingDiagram car={ride.boardCar} cars={LINE_BY_ID[ride.line].cars} />
          <div style={{ fontSize: 13, color: C.body, marginTop: 8, lineHeight: 1.45 }}>{ride.boardReason}</div>
        </Card>

        {ride.decoys.length > 0 && (
          <Banner tone="danger">
            <span style={{ fontWeight: 800, display: 'block', marginBottom: 2 }}>If a different train arrives first</span>
            {ride.decoys.map((d) => d.reason).join(' ')}
          </Banner>
        )}

        <Btn kind="primary" onClick={() => dispatch({ type: 'go', screen: 'train' })}>
          {arriving ? 'My train is here' : 'My train is arriving'}
        </Btn>
        <button
          type="button"
          onClick={() => go('wrong')}
          style={{
            appearance: 'none',
            border: 'none',
            background: 'transparent',
            textAlign: 'center',
            fontSize: 12,
            color: C.faint,
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline dotted',
          }}
        >
          The signs here don’t say “{ride.direction.sign}”
        </button>
        {trip.legIndex > 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: C.faint }}>
            Leg {trip.legIndex + 1} of {rideLegsOf(trip).length}
          </div>
        )}
      </Scroll>
    </>
  );
}

export function PlatformConfirm() {
  const { state, go } = useApp();
  if (!state.trip) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No active trip</div>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }
  const ride = currentRide(state.trip);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PlatformBody ride={ride} second={state.trip.legIndex > 0} />
    </div>
  );
}

export function ArrivalsScreen() {
  const { state, go } = useApp();
  const trip = state.trip;
  const ride = trip ? currentRide(trip) : null;
  const station = ride ? STATION_BY_ID[ride.platform.stationId] : null;
  const mineList = useLiveArrivals(station?.id ?? 'penn-8av', ride?.platform.trunk ?? 'IND8', ride?.dir ?? 'B', state.now);
  const otherList = useLiveArrivals(
    station?.id ?? 'penn-8av',
    ride?.platform.trunk ?? 'IND8',
    ride?.dir === 'A' ? 'B' : 'A',
    state.now,
  );

  if (!trip || !ride || !station) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No platform selected</div>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }

  const opp = oppositeDirWord(ride.platform, ride.dir);

  return (
    <Scroll>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BackBtn onClick={() => go(trip.legIndex === 0 ? 'platform' : 'platform2')} />
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Live arrivals</div>
          <div style={{ fontSize: 12.5, color: C.soft }}>
            {station.name} · {ride.platform.level}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', color: C.greenDeep }}>
        {ride.direction.word.toUpperCase()} PLATFORM — YOURS
      </div>
      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        {mineList.map((a) => (
          <ArrivalRow key={a.id} a={a} isMine={a.line === ride.line} serves={arrivalServes(a, ride.toStation)} />
        ))}
        {!mineList.length && <div style={{ padding: 16, fontSize: 13, color: C.soft }}>Nothing scheduled.</div>}
      </div>

      <Banner tone="danger">
        Don’t wait on the {opp} side — those trains go the other way. Your train leaves from the{' '}
        {ride.direction.word} platform.
      </Banner>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', color: C.faint }}>
        {opp.toUpperCase()} PLATFORM — NOT YOURS
      </div>
      <div style={{ background: C.white, borderRadius: R.panel, boxShadow: SHADOW.card, overflow: 'hidden', opacity: 0.55 }}>
        {otherList.slice(0, 4).map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 15px', borderBottom: `1px solid ${C.line3}` }}>
            <Bullet line={a.line} size={28} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.lineName} — {opp}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.soft, flex: 'none' }}>{etaLabel(a.eta)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <SourceTag stationId={station.id} now={state.now} />
      </div>
    </Scroll>
  );
}

export function WrongPlatform() {
  const { state, go, dispatch } = useApp();
  const trip = state.trip;
  const buzz = useHaptic(state.prefs.haptic);
  const speak = useVoice(state.prefs.voice);

  useEffect(() => {
    buzz([100, 70, 100]);
    speak('You may be on the wrong platform. Turn around.');
  }, [buzz, speak]);

  if (!trip) {
    return (
      <Scroll>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }

  const ride = currentRide(trip);
  const station = STATION_BY_ID[ride.platform.stationId];
  const opp = oppositeDirWord(ride.platform, ride.dir);
  const lines = linesServing(ride.platform, station.id).join('·');
  const steps = turnAroundSteps(station, ride.platform, ride.dir, true);

  return (
    <div className="ml-vscroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.redBg2, padding: 22, overflowY: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
        <span
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: C.redTint,
            color: C.red,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            fontWeight: 800,
          }}
        >
          !
        </span>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.redDeeper, letterSpacing: '-.01em' }}>
            You’re on the {opp} platform
          </div>
          <div style={{ fontSize: 15, color: C.redDeep, marginTop: 9, lineHeight: 1.5, fontWeight: 600 }}>
            Your train leaves from the {ride.direction.word} platform.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
          <Chevrons color={C.red} size={44} thickness={13} count={2} rotate={180} shadow={false} />
          <div style={{ fontSize: 13, fontWeight: 800, color: C.redDeeper, marginTop: 14, letterSpacing: '.06em' }}>
            TURN AROUND
          </div>
        </div>
        <div
          style={{
            background: C.white,
            borderRadius: R.btn,
            padding: '15px 18px',
            boxShadow: '0 2px 10px rgba(145,32,24,.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 14,
            color: C.body,
            fontWeight: 600,
            textAlign: 'left',
          }}
        >
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 9 }}>
              <span style={{ color: C.red, fontWeight: 800 }}>{i + 1}</span>
              <span>{s.title}</span>
            </div>
          ))}
          <div style={{ fontSize: 13, color: C.soft, fontWeight: 500 }}>
            Look for <span style={{ color: C.ink, fontWeight: 800 }}>{ride.direction.word} {lines}</span>.
          </div>
        </div>
      </div>
      <Btn
        kind="danger"
        onClick={() => {
          const steps2 = trip.itinerary.indoorSteps;
          const splitAt = steps2.findIndex((s) => s.kind === 'split');
          dispatch({ type: 'goto-step', index: splitAt >= 0 ? splitAt : 0 });
          go('indoor');
        }}
      >
        Reroute me
      </Btn>
      <button
        type="button"
        onClick={() => go(trip.legIndex === 0 ? 'platform' : 'platform2')}
        style={{
          appearance: 'none',
          border: 'none',
          background: 'transparent',
          textAlign: 'center',
          fontSize: 13,
          color: C.redDeep,
          fontWeight: 600,
          marginTop: 12,
          cursor: 'pointer',
        }}
      >
        I’m actually on the right platform
      </button>
    </div>
  );
}

/** The platform after a transfer — same guarantees, tighter layout. */
export function SecondPlatform() {
  const { state, go, dispatch } = useApp();
  const trip = state.trip;
  const ride = trip ? currentRide(trip) : null;
  const transfer = trip ? currentTransfer(trip) : null;
  const station = ride ? STATION_BY_ID[ride.platform.stationId] : null;
  const list = useLiveArrivals(
    station?.id ?? 'penn-8av',
    ride?.platform.trunk ?? 'IND8',
    ride?.dir ?? 'B',
    state.now,
  );
  if (!trip || !ride || !station) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No active trip</div>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }
  const next = list.find((a) => a.line === ride.line);
  const stopsToGo = ride.stops.length - 1;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <GreenHeader>
        Correct platform — {ride.direction.word} {ride.line}
      </GreenHeader>
      <Scroll pad="13px 16px 90px" gap={11}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Bullet line={ride.line} size={34} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>
                {ride.direction.word} {ride.line} Platform
              </div>
              <div style={{ fontSize: 12.5, color: C.soft }}>
                toward {ride.toward} · {ride.kind === 'EXPRESS' ? 'Express' : 'Local'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, marginTop: 13 }}>
            <KV label="Your stop">
              <span style={{ fontWeight: 600 }}>
                {STATION_BY_ID[ride.toStation].name} — {stopsToGo} stop{stopsToGo === 1 ? '' : 's'} away
              </span>
            </KV>
            <KV label="Next train">
              <span style={{ fontWeight: 700, color: C.brand }}>
                {ride.line} — {next ? etaLabel(next.eta, true) : '—'}
              </span>
            </KV>
            <KV label="Confirm it">
              Overhead signs read “{ride.direction.sign}”. Platform edge is on your{' '}
              {platformSide(ride.platform, ride.dir).toLowerCase()}.
            </KV>
            {transfer && (
              <KV label="Transfer">
                {transfer.stepFree ? 'Step-free' : 'Stairs / escalator'} ·{' '}
                {Math.max(1, Math.round(transfer.walkSeconds / 60))} min walk between platforms
              </KV>
            )}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Where to stand</div>
          <BoardingDiagram car={ride.boardCar} cars={LINE_BY_ID[ride.line].cars} />
          <div style={{ fontSize: 13, color: C.body, marginTop: 8, lineHeight: 1.45 }}>{ride.boardReason}</div>
        </Card>

        {ride.decoys.length > 0 && <Banner tone="danger">{ride.decoys.map((d) => d.reason).join(' ')}</Banner>}

        <Btn kind="primary" onClick={() => dispatch({ type: 'board' })}>
          I’m on board — {stopsToGo} stop{stopsToGo === 1 ? '' : 's'}
        </Btn>
        <button
          type="button"
          onClick={() => go('arrivals')}
          style={{ appearance: 'none', border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: C.brand, cursor: 'pointer' }}
        >
          See all arrivals →
        </button>
      </Scroll>
    </div>
  );
}
