import { z } from "zod";
import type { RunPhase, RunStatusKind, SensorReadingsDto, TraceSampleDto } from "./api";

/**
 * Runtime validation for the payloads that arrive from the power board over SignalR. The board is the
 * one source the UI can't typecheck at build time, and a malformed/NaN value would otherwise poison a
 * live gauge ("NaN °C") or break a chart's scale. Each parser returns the typed value when the payload
 * matches the contract, else null — the caller drops it, so the gauges/charts keep their last good
 * value (the same thing they already do when the board is offline).
 */

/** A finite number — rejects NaN/Infinity, which a misbehaving board could emit. */
const finiteNumber = z.number().refine((n) => Number.isFinite(n), { message: "número não-finito" });

/** Latched board fault on the diagnostics tick (drives the fault banner). Strings only — `severity` is
 *  a pt-BR literal we display verbatim, not pinned to an enum here. */
const faultSchema = z.object({
  code: z.string(),
  severity: z.string(),
  message: z.string(),
});

const sensorReadingsSchema = z.object({
  boardTempC: finiteNumber,
  boardFanRpm: finiteNumber,
  ovenTempC: finiteNumber,
  ovenFanRpm: finiteNumber,
  voltageV: finiteNumber,
  currentA: finiteNumber,
  // Optional + nullable on purpose: an older board/backend tick omits the field (→ undefined → "no
  // fault"), present-but-null means healthy. Kept tolerant so a missing fault never drops an otherwise
  // valid reading (which would freeze the BottomBar gauges).
  fault: faultSchema.nullish(),
}) satisfies z.ZodType<SensorReadingsDto>;

const traceSampleSchema = z.object({
  t: finiteNumber,
  alvo: finiteNumber,
  oven: finiteNumber,
  board: finiteNumber,
  current: finiteNumber,
  voltage: finiteNumber,
  ovenFan: finiteNumber,
  boardFan: finiteNumber,
}) satisfies z.ZodType<TraceSampleDto>;

const runPhaseSchema = z.enum(["Aquecimento", "Patamar", "Pico", "Resfriamento"]);
const runStatusSchema = z.enum(["running", "done", "aborted"]);

export function parseSensorReadings(raw: unknown): SensorReadingsDto | null {
  const r = sensorReadingsSchema.safeParse(raw);
  return r.success ? r.data : null;
}
export function parseTraceSample(raw: unknown): TraceSampleDto | null {
  const r = traceSampleSchema.safeParse(raw);
  return r.success ? r.data : null;
}
export function parseRunPhase(raw: unknown): RunPhase | null {
  const r = runPhaseSchema.safeParse(raw);
  return r.success ? r.data : null;
}
export function parseRunStatus(raw: unknown): RunStatusKind | null {
  const r = runStatusSchema.safeParse(raw);
  return r.success ? r.data : null;
}
