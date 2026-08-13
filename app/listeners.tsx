"use client";

import { useEffect, useState } from "react";

/**
 * SIMULATED listener count — this is not a real measurement.
 *
 * There is no backend and no presence tracking; the number below is derived
 * purely from the current timestamp. It is deliberately NOT Math.random():
 * a per-client random value gives two people in the same room different
 * numbers and teleports on every refresh, which reads as fake immediately.
 *
 * Instead the count is a pure function of epoch time, so:
 *   - every visitor worldwide sees the same number at the same instant
 *   - it drifts smoothly rather than jumping
 *   - it follows a plausible daily rhythm (quiet at dawn, busy late night)
 *
 * If a real count is ever wired up, delete this file wholesale — don't try to
 * blend real data into this curve.
 */

const MIN = 100;
const MAX = 500;

/** Refresh cadence. Slow enough to feel like people, not a ticker. */
const TICK_MS = 6_000;

/**
 * Relative activity by hour of day (IST), 0..1.
 * Anchored to a trucker-ish rhythm: trough around 5am, peak near 10pm.
 * A single cosine can't do this — its peak and trough are locked 12h apart,
 * and we need ~17h. So these are control points, smoothly interpolated.
 */
const DIURNAL: ReadonlyArray<readonly [hour: number, level: number]> = [
  [0, 0.8],
  [3, 0.35],
  [5, 0.08],
  [8, 0.32],
  [12, 0.52],
  [15, 0.55],
  [18, 0.76],
  [21, 0.97],
  [23, 0.9],
];

/** Cosine ease between control points — C1-continuous, so no visible corners. */
function diurnalLevel(hour: number): number {
  const pts = DIURNAL;
  let a = pts[pts.length - 1];
  let b = pts[0];
  let span = 24 - a[0] + b[0];
  let offset = (hour - a[0] + 24) % 24;

  for (let i = 0; i < pts.length - 1; i++) {
    if (hour >= pts[i][0] && hour < pts[i + 1][0]) {
      a = pts[i];
      b = pts[i + 1];
      span = b[0] - a[0];
      offset = hour - a[0];
      break;
    }
  }

  const t = span === 0 ? 0 : offset / span;
  const eased = (1 - Math.cos(t * Math.PI)) / 2;
  return a[1] + (b[1] - a[1]) * eased;
}

/**
 * Smooth wander in roughly -1..1 from summed sines with incommensurate
 * periods (~37s, ~1.6min, ~5min, ~8.7min). Deterministic, no PRNG, never
 * repeats on a timescale anyone will sit through. The two fast terms are what
 * make it tick both up and down instead of sliding one way for minutes.
 */
function wander(epochSeconds: number): number {
  const s =
    Math.sin(epochSeconds / 37) * 0.35 +
    Math.sin(epochSeconds / 97) * 0.5 +
    Math.sin(epochSeconds / 311) +
    Math.sin(epochSeconds / 523) * 0.7;
  return s / 2.55;
}

/** IST hour (with fraction) for a given instant — fixed TZ so the curve is global. */
function istHour(epochMs: number): number {
  const istMs = epochMs + 5.5 * 60 * 60 * 1000;
  return ((istMs / 3_600_000) % 24 || 0) % 24;
}

export function listenerCount(epochMs: number): number {
  const level = diurnalLevel(istHour(epochMs));
  const base = MIN + (MAX - MIN) * level;
  const drift = wander(epochMs / 1000) * 28;
  return Math.round(Math.min(MAX, Math.max(MIN, base + drift)));
}

export function Listeners() {
  // Null until mounted: the server has no business rendering a live number,
  // and rendering one would hydration-mismatch against the client's clock.
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setCount(listenerCount(Date.now()));
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  if (count === null) return <div className="listeners" aria-hidden="true" />;

  return (
    <div className="listeners">
      <span className="listeners__dot" aria-hidden="true" />
      <span className="listeners__count">{count.toLocaleString("en-IN")}</span>
      <span className="listeners__label">listening</span>
    </div>
  );
}
