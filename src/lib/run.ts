/**
 * Mock reflow-run simulation helpers. The real run is driven by the power board over RS422;
 * here we interpolate the programmed setpoint profile against elapsed time and derive a phase
 * and plausible actuator readings so the execution screen can animate. TODO(backend).
 */

import type { ProfilePoint } from "./programs";

export type RunPhase = "Aquecimento" | "Patamar" | "Pico" | "Resfriamento";

/** Total run length in seconds (the last setpoint's time). */
export function totalTime(profile: ProfilePoint[]): number {
  return profile.length ? profile[profile.length - 1].t : 0;
}

/** Peak setpoint temperature (°C). */
export function peakTemp(profile: ProfilePoint[]): number {
  return profile.reduce((max, p) => Math.max(max, p.temp), 0);
}

/** Linear-interpolate the setpoint temperature at time `t` (clamped to the profile ends). */
export function tempAt(profile: ProfilePoint[], t: number): number {
  if (!profile.length) return 0;
  if (t <= profile[0].t) return profile[0].temp;
  const last = profile[profile.length - 1];
  if (t >= last.t) return last.temp;
  for (let i = 1; i < profile.length; i++) {
    const b = profile[i];
    if (t <= b.t) {
      const a = profile[i - 1];
      const span = b.t - a.t || 1;
      return a.temp + ((b.temp - a.temp) * (t - a.t)) / span;
    }
  }
  return last.temp;
}

/** Classify the moment in the run from the local slope and proximity to the peak. */
export function phaseAt(profile: ProfilePoint[], t: number): RunPhase {
  const peakAt = profile.reduce((best, p) => (p.temp > best.temp ? p : best), profile[0]).t;
  if (Math.abs(t - peakAt) <= 8) return "Pico";
  const slope = tempAt(profile, t + 2) - tempAt(profile, t);
  if (slope > 0.5) return "Aquecimento";
  if (slope < -0.5) return "Resfriamento";
  return "Patamar";
}

/** Seconds → "m:ss". */
export function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
