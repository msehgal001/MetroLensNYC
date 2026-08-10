import { useEffect } from 'react';
import { currentRide, currentTransfer, rideLegsOf, useApp } from '../state/store';
import { Banner, Btn, Bullet, Card, GreenHeader, KV, Scroll } from '../components/ui';
import { C, R, SHADOW } from '../theme';
import { LINE_BY_ID, STATION_BY_ID, linesServing } from '../engine/shared';
import { useHaptic, useVoice } from '../hooks/useSensors';

export function TrainConfirm() {
  const { state, go, dispatch } = useApp();
  const trip = state.trip;
  const speak = useVoice(state.prefs.voice);
  const ride = trip ? currentRide(trip) : null;

  useEffect(() => {
    if (ride) speak(`This is your train. ${ride.lineName} toward ${ride.toward}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.line]);

  if (!trip || !ride) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No active trip</div>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }

  const line = LINE_BY_ID[ride.line];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <GreenHeader>This is your train</GreenHeader>
      <Scroll pad="20px 16px 90px" gap={13} style={{ alignItems: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: line.color,
            color: line.textColor,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 46,
            fontWeight: 800,
            boxShadow: '0 10px 26px rgba(0,57,166,.35)',
            marginTop: 8,
            flex: 'none',
          }}
        >
          {ride.line}
        </span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.01em' }}>{ride.lineName}</div>
          <div style={{ fontSize: 15, color: C.soft, marginTop: 3 }}>toward {ride.toward}</div>
          <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ background: C.ink, color: C.white, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '4px 9px', letterSpacing: '.04em' }}>
              {ride.kind}
            </span>
            <span style={{ background: C.brandTint, color: C.brand, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '4px 9px' }}>
              {ride.direction.long}
            </span>
          </div>
        </div>

        {ride.decoys.length > 0 ? (
          <Banner tone="danger" style={{ alignSelf: 'stretch', borderRadius: R.btn, padding: '13px 15px' }}>
            <span style={{ display: 'block', fontWeight: 800, marginBottom: 2 }}>If a different train arrives first</span>
            {ride.decoys.map((d) => d.reason).join(' ')}
          </Banner>
        ) : (
          <Banner tone="success" style={{ alignSelf: 'stretch', borderRadius: R.btn, padding: '13px 15px' }}>
            Every train on this platform reaches {STATION_BY_ID[ride.toStation].shortName}
            {ride.alternates.length ? ` — the ${ride.alternates.map((a) => a.line).join(' and ')} work too.` : '.'}
          </Banner>
        )}

        <Card style={{ alignSelf: 'stretch' }}>
          <div style={{ fontSize: 13.5, color: C.body, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700 }}>Ride in the {ride.boardCar} of the train.</span> {ride.boardReason}
          </div>
        </Card>

        <Btn kind="green" style={{ alignSelf: 'stretch' }} onClick={() => dispatch({ type: 'board' })}>
          I’m on board
        </Btn>
        <button
          type="button"
          onClick={() => go(trip.legIndex === 0 ? 'platform' : 'platform2')}
          style={{ appearance: 'none', border: 'none', background: 'transparent', fontSize: 13, color: C.faint, fontWeight: 600, cursor: 'pointer' }}
        >
          Not this one — back to the platform
        </button>
      </Scroll>
    </div>
  );
}

export function InTrain() {
  const { state, dispatch, go } = useApp();
  const trip = state.trip;
  const speak = useVoice(state.prefs.voice);
  const buzz = useHaptic(state.prefs.haptic);
  const ride = trip ? currentRide(trip) : null;

  // Auto-advance stops so the progress view keeps up on a moving train.
  useEffect(() => {
    if (!state.prefs.autoAdvance || !trip || !ride) return;
    if (trip.stopIndex >= ride.stops.length - 1) return;
    const id = window.setTimeout(() => dispatch({ type: 'next-stop' }), 9000);
    return () => window.clearTimeout(id);
  }, [state.prefs.autoAdvance, trip, ride, dispatch]);

  useEffect(() => {
    if (!trip || !ride) return;
    const remaining = ride.stops.length - 1 - trip.stopIndex;
    if (remaining === 1) {
      speak('Next stop is yours. Get ready.');
      buzz([60, 50, 60]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.stopIndex]);

  if (!trip || !ride) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No active trip</div>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }

  const line = LINE_BY_ID[ride.line];
  const remaining = ride.stops.length - 1 - trip.stopIndex;
  const rides = rideLegsOf(trip);
  const isLastLeg = trip.legIndex >= rides.length - 1;
  const nextTransfer = !isLastLeg ? rides[trip.legIndex + 1] : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 'none', background: C.ink2, color: C.onColor, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: line.color,
            color: line.textColor,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
            flex: 'none',
          }}
        >
          {ride.line}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>{ride.lineName}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            toward {ride.toward}
          </div>
        </div>
        <span style={{ background: C.brand, borderRadius: 999, padding: '5px 11px', fontSize: 12, fontWeight: 700, flex: 'none' }}>
          {remaining > 1 ? `Exit in ${remaining} stops` : remaining === 1 ? 'Exit at the next stop' : 'Exit here'}
        </span>
      </div>

      <Scroll pad="13px 16px 90px" gap={11}>
        <Card pad="16px 16px 8px">
          {ride.stops.map((id, i) => {
            const st = STATION_BY_ID[id];
            const here = i === trip.stopIndex;
            const done = i < trip.stopIndex;
            const isExit = i === ride.stops.length - 1;
            return (
              <div key={id} style={{ display: 'flex', gap: 13, alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', width: 18 }}>
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      background: done ? C.dot : here ? C.brand : C.white,
                      border: `2.5px solid ${here ? C.brand : C.dot}`,
                      flex: 'none',
                      marginTop: 3,
                    }}
                  />
                  {i < ride.stops.length - 1 && <span style={{ flex: 1, width: 3, background: C.track, marginTop: 2 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: here ? 700 : 500, color: done ? C.faint : C.ink }}>
                      {st.name}
                    </span>
                    <span style={{ fontSize: 11.5, color: C.brand, fontWeight: 700, flex: 'none' }}>
                      {here ? 'You are here' : i === trip.stopIndex + 1 ? 'Next' : ''}
                    </span>
                  </div>
                  {isExit && (
                    <div style={{ fontSize: 11.5, color: C.amber, fontWeight: 700, marginTop: 2 }}>
                      {nextTransfer ? `Transfer here — ${nextTransfer.direction.word} ${nextTransfer.line}` : 'Your exit'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Card>

        {nextTransfer && (
          <div style={{ background: C.white, borderRadius: R.panel, padding: '14px 16px', boxShadow: SHADOW.card, display: 'flex', gap: 11, alignItems: 'center' }}>
            <Bullet line={nextTransfer.line} size={28} />
            <div style={{ fontSize: 13, color: C.body, lineHeight: 1.45 }}>
              <span style={{ fontWeight: 700 }}>Transfer coming up:</span> at{' '}
              {STATION_BY_ID[ride.toStation].shortName}, follow signs for {nextTransfer.direction.word}{' '}
              {linesServing(nextTransfer.platform, nextTransfer.platform.stationId).join('·')}. The {ride.boardCar} doors
              open closest to the transfer passage.
            </div>
          </div>
        )}

        {!nextTransfer && (
          <Card>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.brand, letterSpacing: '.06em' }}>AT YOUR STOP</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 5 }}>
              {trip.itinerary.exit.exitName} — {trip.itinerary.exit.streets}
            </div>
            <div style={{ fontSize: 13, color: C.soft, marginTop: 3, lineHeight: 1.45 }}>
              You are riding in the {ride.boardCar} of the train, which is closest to those stairs.
            </div>
          </Card>
        )}

        <Btn kind="primary" size="md" onClick={() => dispatch({ type: 'next-stop' })}>
          {remaining > 0
            ? 'Skip ahead: next stop'
            : nextTransfer
              ? 'Exit here — start transfer'
              : 'Exit here — to the street'}
        </Btn>
      </Scroll>
    </div>
  );
}

export function TransferScreen() {
  const { state, dispatch, go } = useApp();
  const trip = state.trip;
  const speak = useVoice(state.prefs.voice);
  const transfer = trip ? currentTransfer(trip) : null;
  const ride = trip ? currentRide(trip) : null;

  useEffect(() => {
    if (transfer && ride) speak(`Transfer to the ${ride.direction.word} ${ride.line}. ${transfer.steps[0]?.detail ?? ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfer?.stationId]);

  if (!trip || !transfer || !ride) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No transfer in progress</div>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }

  const station = STATION_BY_ID[transfer.stationId];
  const index = Math.min(trip.transferStepIndex, Math.max(0, transfer.steps.length - 1));

  return (
    <Scroll pad="12px 16px 90px" gap={12}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bullet line={ride.line} size={34} />
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Transfer at {station.shortName}</div>
          <div style={{ fontSize: 12.5, color: C.soft }}>
            Next platform: {ride.direction.word} {ride.line} · toward {ride.toward}
          </div>
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: R.card, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        {transfer.steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => dispatch({ type: 'transfer-step', delta: i - index })}
            style={{
              appearance: 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              gap: 12,
              padding: '13px 16px',
              borderBottom: i < transfer.steps.length - 1 ? `1px solid ${C.line2}` : 'none',
              background: i === index ? C.brandFaint : C.white,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: i < index ? C.greenDeep : C.brandTint,
                color: i < index ? C.white : C.brand,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flex: 'none',
              }}
            >
              {i < index ? '✓' : i + 1}
            </span>
            <span style={{ fontSize: 14, alignSelf: 'center' }}>
              <span style={{ fontWeight: 700 }}>{s.title}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: C.soft, marginTop: 2, lineHeight: 1.4 }}>
                {s.detail}
              </span>
              {s.warning && (
                <span style={{ display: 'block', fontSize: 12, color: C.amberDeep, fontWeight: 700, marginTop: 3 }}>
                  {s.warning}
                </span>
              )}
            </span>
          </button>
        ))}
        {!transfer.steps.length && (
          <div style={{ padding: 16, fontSize: 13.5, color: C.body, lineHeight: 1.5 }}>
            Same platform — just wait where you are. Your {ride.line} arrives on this side.
          </div>
        )}
      </div>

      <Banner tone="success">
        Free transfer — you don’t need to pay again. {transfer.stepFree ? 'This transfer is step-free.' : 'This transfer uses stairs or an escalator.'}
      </Banner>

      <Btn kind="primary" onClick={() => dispatch({ type: 'next-leg' })}>
        I’m on the {ride.direction.word} {ride.line} platform
      </Btn>
    </Scroll>
  );
}

export function ExitScreen() {
  const { state, dispatch, go } = useApp();
  const trip = state.trip;
  const speak = useVoice(state.prefs.voice);

  useEffect(() => {
    if (trip) speak(`Arriving at ${trip.itinerary.exitStation.name}. Use ${trip.itinerary.exit.exitName}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.itinerary.id]);

  if (!trip) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No active trip</div>
        <Btn onClick={() => go('home')}>Back to Home</Btn>
      </Scroll>
    );
  }

  const itin = trip.itinerary;
  const walkOut = [...itin.legs].reverse().find((l) => l.type === 'walk');
  const elapsed = Math.max(1, Math.round((state.now - trip.startedAt) / 60000));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 'none', display: 'flex', gap: 10, alignItems: 'center', background: C.brand, color: C.onColor, padding: '13px 16px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.onColor, animation: 'ml-pulse 1.2s infinite' }} />
        <span style={{ fontSize: 15.5, fontWeight: 700 }}>Arriving: {itin.exitStation.name}</span>
      </div>
      <Scroll pad="13px 16px 40px" gap={11}>
        <Card>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.brand, letterSpacing: '.06em' }}>YOUR EXIT</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 5 }}>{itin.exit.exitName}</div>
          <div style={{ fontSize: 14.5, color: C.body, marginTop: 2, fontWeight: 600 }}>{itin.exit.streets}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, marginTop: 13 }}>
            {itin.exitSteps.map((s) => (
              <KV key={s.id} label={s.kind === 'platform' ? 'On board' : s.kind === 'exit' ? 'Street' : 'Then'} w={78}>
                <span style={{ fontWeight: 600 }}>{s.title}</span> — {s.detail}
              </KV>
            ))}
            {walkOut && walkOut.type === 'walk' && (
              <KV label="Finally" w={78}>
                {walkOut.instruction}
              </KV>
            )}
          </div>
        </Card>

        <Card style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: C.greenTint,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 9,
            }}
          >
            <span
              style={{
                width: 16,
                height: 9,
                borderLeft: `3px solid ${C.greenDeep}`,
                borderBottom: `3px solid ${C.greenDeep}`,
                transform: 'rotate(-45deg)',
                marginTop: -4,
              }}
            />
          </span>
          <div style={{ fontSize: 17, fontWeight: 800 }}>You made it</div>
          <div style={{ fontSize: 13, color: C.soft, marginTop: 3, lineHeight: 1.45 }}>
            {itin.destination.name} · {elapsed} min · every platform correct on the first try
          </div>
        </Card>

        <Btn kind="dark" onClick={() => dispatch({ type: 'end-trip', completed: true })}>
          End trip
        </Btn>
      </Scroll>
    </div>
  );
}
