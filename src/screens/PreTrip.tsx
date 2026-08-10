import type { ReactNode } from 'react';
import { useApp } from '../state/store';
import { BackBtn, Badges, Btn, Scroll } from '../components/ui';
import { C, R, SHADOW } from '../theme';
import { durationLabel, oppositeDirWord, rideLegs, transferLegs, transfersLabel } from '../engine/router';
import { STATION_BY_ID, linesServing } from '../engine/shared';

function Step({
  n,
  label,
  children,
  tone,
}: {
  n: ReactNode;
  label?: string;
  children: ReactNode;
  tone?: 'warn';
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '14px 16px',
        borderBottom: `1px solid ${C.line2}`,
        background: tone === 'warn' ? C.amberBg : undefined,
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: tone === 'warn' ? C.amberTint : C.brandTint,
          color: tone === 'warn' ? C.amberDeep : C.brand,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: tone === 'warn' ? 14 : 13,
          fontWeight: tone === 'warn' ? 800 : 700,
          flex: 'none',
        }}
      >
        {n}
      </span>
      <div style={{ flex: 1, alignSelf: tone === 'warn' ? 'center' : undefined }}>
        {label && <div style={{ fontSize: 12, color: C.faint, fontWeight: 600 }}>{label}</div>}
        <div style={{ marginTop: label ? 2 : 0 }}>{children}</div>
      </div>
    </div>
  );
}

export function PreTrip() {
  const { state, go, dispatch } = useApp();
  const trip = state.trip;
  if (!trip) {
    return (
      <Scroll>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No trip selected</div>
        <Btn onClick={() => go('search')}>Plan a trip</Btn>
      </Scroll>
    );
  }

  const itin = trip.itinerary;
  const ride = itin.firstRide;
  const rides = rideLegs(itin);
  const transfers = transferLegs(itin);
  const platformLines = linesServing(ride.platform, itin.entryStation.id).join('·');
  const opp = oppositeDirWord(ride.platform, ride.dir);
  const lastRide = rides[rides.length - 1];
  const decoy = ride.decoys[0];
  let n = 0;

  return (
    <Scroll>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BackBtn onClick={() => go(state.routes.length ? 'routes' : 'home')} />
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Know before you go</div>
          <div style={{ fontSize: 12.5, color: C.soft }}>
            {itin.destination.name} · {durationLabel(itin.seconds)} · {transfersLabel(itin.transferCount).toLowerCase()}
          </div>
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: R.card, boxShadow: SHADOW.card, overflow: 'hidden' }}>
        <Step n={++n} label="ENTRANCE">
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>{itin.entrance.streets}</div>
          <div style={{ fontSize: 12.5, color: C.soft, marginTop: 1 }}>
            {itin.entryStation.name} · {itin.entrance.quadrant} corner
            {itin.entrance.ada ? ' · step-free' : ''}
          </div>
        </Step>

        <Step n={++n} label="PLATFORM YOU NEED">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>
              {ride.direction.word} {platformLines}
            </span>
            <Badges platform={ride.platform} stationId={itin.entryStation.id} />
          </div>
          <div style={{ fontSize: 12.5, color: C.soft, marginTop: 1 }}>
            {ride.platform.level} · trains arrive on the{' '}
            {ride.dir === 'B' ? ride.platform.sideB : ride.platform.sideB === 'LEFT' ? 'RIGHT' : 'LEFT'} side
          </div>
        </Step>

        <Step n={++n} label="TRAIN">
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>
            {ride.lineName} toward {ride.toward}
          </div>
          <div style={{ fontSize: 12.5, color: C.soft, marginTop: 1 }}>{ride.direction.long}</div>
          <span
            style={{
              display: 'inline-block',
              marginTop: 5,
              background: C.ink,
              color: C.white,
              fontSize: 10.5,
              fontWeight: 700,
              borderRadius: 5,
              padding: '2.5px 7px',
              letterSpacing: '.04em',
            }}
          >
            {ride.kind}
          </span>
        </Step>

        <Step n="!" tone="warn">
          <div style={{ fontSize: 13.5, color: C.amberInk, fontWeight: 600, lineHeight: 1.45 }}>
            Do not go to the {opp} side — those trains head the other way.
            {decoy ? ` ${decoy.reason}` : ''}
          </div>
        </Step>

        <Step n={++n} label="BOARDING POSITION">
          <div style={{ fontSize: 13.5, color: C.body, lineHeight: 1.45 }}>{ride.boardReason}</div>
        </Step>

        {transfers.map((t, i) => (
          <Step key={t.stationId + i} n={++n} label="TRANSFER">
            <div style={{ fontSize: 13.5, color: C.body, lineHeight: 1.45 }}>
              {STATION_BY_ID[t.stationId].name}: follow signs for {rides[i + 1].direction.word} {t.toLine}.{' '}
              {t.stepFree ? 'Step-free.' : 'Stairs or escalator.'} Stay inside fare control —{' '}
              {Math.max(1, Math.round(t.walkSeconds / 60))} min walk.
            </div>
          </Step>
        ))}

        <Step n={++n} label="DESTINATION EXIT">
          <div style={{ fontSize: 13.5, color: C.body, lineHeight: 1.45 }}>
            {itin.exitStation.name}: use {itin.exit.exitName} — {itin.exit.streets}. Ride in the{' '}
            {lastRide.boardCar} of the train.
          </div>
        </Step>
      </div>

      <Btn onClick={() => go('outdoor')}>Start Navigation</Btn>
      <button
        type="button"
        onClick={() => dispatch({ type: 'save-trip' })}
        style={{ appearance: 'none', border: 'none', background: 'transparent', textAlign: 'center', fontSize: 13, color: C.faint, fontWeight: 600, cursor: 'pointer' }}
      >
        Save trip for later
      </button>
    </Scroll>
  );
}
