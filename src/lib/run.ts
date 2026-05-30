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
  if (!profile.length) return "Patamar";
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

// --- Live signals plotted on the execution chart ---------------------------------------

/** The signals the execution chart can show (operator picks which in Configurações → Geral). */
export type RunSignalId = "alvo" | "oven" | "board" | "current" | "voltage" | "ovenFan" | "boardFan";

export type RunSignalDef = { id: RunSignalId; name: string; unit: string; color: string };

/** Catalog of the execution signals (colors match the Relatórios snapshot for consistency). */
export const RUN_SIGNALS: RunSignalDef[] = [
  { id: "alvo", name: "Alvo (setpoint)", unit: "°C", color: "#93c5fd" },
  { id: "oven", name: "Temp. Grelha", unit: "°C", color: "#fbbf24" },
  { id: "board", name: "Temp. Dissipador", unit: "°C", color: "#a78bfa" },
  { id: "current", name: "Corrente", unit: "A", color: "#f87171" },
  { id: "voltage", name: "Tensão", unit: "V", color: "#22d3ee" },
  { id: "ovenFan", name: "Fan Forno", unit: "rpm", color: "#f472b6" },
  { id: "boardFan", name: "Fan Diss.", unit: "rpm", color: "#34d399" },
];

/** Which signals are shown by default (the operator can change this in Configurações). */
export const DEFAULT_RUN_SERIES: Record<RunSignalId, boolean> = {
  alvo: true,
  oven: true,
  board: false,
  current: true,
  voltage: true,
  ovenFan: false,
  boardFan: false,
};
