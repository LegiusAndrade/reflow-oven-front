import { z } from "zod";

/**
 * Zod schemas for the high-value REST responses. Passed to the api client (see `request`'s `schema`
 * option) to detect backend contract drift: a mismatch logs a warning but the data still flows, so an
 * imperfect schema can never break a valid response — it's a diagnostic, not a runtime gate. The
 * enums (role / status / phase / ramp) are the parts worth pinning exactly; looser elsewhere.
 */

const role = z.enum(["Admin", "Regular", "Master"]);
const theme = z.enum(["light", "dark", "system"]);
const rampShape = z.enum(["Linear", "Fixo", "Parábola positiva", "Parábola negativa"]);
const runStatusKind = z.enum(["running", "done", "aborted"]);
const runPhase = z.enum(["Aquecimento", "Patamar", "Pico", "Resfriamento"]);

/** GET /api/auth/me — the session drives role gating, so the role enum matters. */
export const sessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  role,
  loginAt: z.number(),
  calibration: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
  theme,
  chartSeries: z.record(z.string(), z.boolean()).optional(),
});

const profilePoint = z.object({ t: z.number(), temp: z.number() });
const profileSegment = z.object({ temp: z.number(), durationSec: z.number(), ramp: rampShape });

const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  runCount: z.number(),
  lastUsed: z.string().nullish(),
  profile: z.array(profilePoint),
  segments: z.array(profileSegment).nullish(),
  favorite: z.boolean(),
  canDelete: z.boolean(),
});

/** GET /api/programs — the paginated grid data. */
export const pagedProgramsSchema = z.object({
  items: z.array(programSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

const traceSample = z.object({
  t: z.number(),
  alvo: z.number(),
  oven: z.number(),
  board: z.number(),
  current: z.number(),
  voltage: z.number(),
  ovenFan: z.number(),
  boardFan: z.number(),
});

/** GET /api/runs/status — drives the live run UI (null when no run is active is handled by the caller). */
export const runStatusSchema = z.object({
  runId: z.string(),
  programId: z.string(),
  programName: z.string(),
  status: runStatusKind,
  phase: runPhase,
  startedAt: z.string(),
  elapsedSeconds: z.number(),
  totalSeconds: z.number(),
  progress: z.number(),
  last: traceSample.nullish(),
});
