import { z } from "zod";

/**
 * Zod schemas for the high-value REST responses. Passed to the api client (see `request`'s `schema`
 * option) to detect backend contract drift: a mismatch logs a warning but the data still flows, so an
 * imperfect schema can never break a valid response — it's a diagnostic, not a runtime gate. The
 * enums (role / status / phase / ramp) are the parts worth pinning exactly; looser elsewhere.
 */

const role = z.enum(["Admin", "Regular", "Master", "Tecnico"]);
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

/** POST /api/auth/change-password — mirror of the backend ChangePasswordResult. Changing your own
 *  password revokes every token minted under the old one, so the response carries a FRESH token +
 *  session (same shape as login's): the client swaps its JWT and stays signed in. */
export const changePasswordResultSchema = z.object({
  ok: z.boolean(),
  token: z.string(),
  expiresAt: z.string(),
  session: sessionSchema,
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

/** Auto-tune outcome — pt-BR wire literals (the accent on "Concluído" is part of the contract). */
const autotuneStatus = z.enum(["Executando", "Concluído", "Falha", "Cancelado"]);

const autotuneRun = z.object({
  id: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullish(),
  durationSeconds: z.number(),
  status: autotuneStatus,
  targetTemp: z.number(),
  cycles: z.number(),
  ku: z.number().nullish(),
  tuMs: z.number().nullish(),
  kp: z.number().nullish(),
  ki: z.number().nullish(),
  kd: z.number().nullish(),
  prevKp: z.number(),
  prevKi: z.number(),
  prevKd: z.number(),
  applied: z.boolean(),
  dismissed: z.boolean(),
  errorReason: z.string().nullish(),
  faultCode: z.string().nullish(),
  triggeredBy: z.string().nullish(),
});

/** GET/POST /api/autotune/{status,start,cancel} — the live tune, or the last finished one when idle. */
export const autotuneStatusSchema = z.object({
  running: z.boolean(),
  current: autotuneRun.nullish(),
});

const notificationSetting = z.object({
  id: z.string(),
  alert: z.string(),
  process: z.enum(["Parar Processo", "Continuar Processo"]),
  buzzer: z.boolean(),
  sound: z.enum(["Contínuo", "Pulsante"]),
  kind: z.enum(["Normal", "Atenção", "Crítica", "Grave"]),
});

/** GET /api/settings — device settings. These are safety-relevant (PID gains, oven max temp/fan,
 *  voltage window, max extra time), so a drift in the wire shape is worth a warning. The pt-BR
 *  enum literals (process/sound/kind) are part of the contract — pinned exactly, accents included. */
export const settingsSchema = z.object({
  pid: z.object({ p: z.number(), i: z.number(), d: z.number() }),
  oven: z.object({ maxTemp: z.number(), maxFanRpm: z.number() }),
  process: z.object({ maxExtraTimeSec: z.number() }),
  voltage: z.object({ min: z.number(), max: z.number() }),
  network: z.object({
    ip: z.string(),
    mask: z.string(),
    gateway: z.string(),
    dnsPrimary: z.string(),
    dnsSecondary: z.string(),
    staticIp: z.boolean(),
  }),
  notifications: z.array(notificationSetting),
  run: z.object({ series: z.record(z.string(), z.boolean()) }),
});

/** GET /api/autotune/history — paginated past tunes ("quantas vezes foi feito" = total). */
export const autotuneHistorySchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  items: z.array(autotuneRun),
});

/** Deep-link target a feed notification may carry (the retention purge warning): points at the
 *  Relatórios screen with the date filter preset to `until` (ISO date) — i.e. the records the next
 *  daily retention sweep will delete. The `tab` literal is the wire contract. */
const notificationDeepLink = z.object({ tab: z.literal("relatorios"), until: z.string() });

/** GET /api/notifications — the TopBar bell / Notificações feed. `deepLink` is optional/null
 *  (today only the purge warning carries one); `kind` uses the lowercase wire literals. */
export const notificationsSchema = z.array(
  z.object({
    id: z.string(),
    kind: z.enum(["info", "warning", "error", "update"]),
    at: z.string(),
    title: z.string(),
    message: z.string(),
    read: z.boolean(),
    deepLink: notificationDeepLink.nullish(),
  })
);
