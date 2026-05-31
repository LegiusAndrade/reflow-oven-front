/**
 * Central input/domain limits ("defines"). Every text length, numeric range and list-size
 * cap in the app lives here so it can be found and tuned in one place — see the "Limits"
 * convention in CLAUDE.md. Import these constants; never hard-code a magic cap at the call site.
 */

/** Program name — maximum characters. */
export const PROGRAM_NAME_MAX_LENGTH = 40;

/** Program description — maximum characters. */
export const PROGRAM_DESCRIPTION_MAX_LENGTH = 120;

/** Temperature profile — maximum number of points. */
export const PROFILE_MAX_POINTS = 30;

/** Per-point target temperature (°C). */
export const POINT_TEMP_MIN = 0;
export const POINT_TEMP_MAX = 500;

/** Per-point duration (seconds). */
export const POINT_DURATION_MIN = 0;
export const POINT_DURATION_MAX = 3600;

// --- Configurações ---------------------------------------------------------------------

/** PID gains (P, I, D) — allow fractional values. */
export const PID_MIN = 0;
export const PID_MAX = 1000;

/** Oven maximum temperature (°C). */
export const CONFIG_TEMP_MIN = 0;
export const CONFIG_TEMP_MAX = 500;

/** Fan speed (RPM). */
export const CONFIG_FAN_RPM_MIN = 0;
export const CONFIG_FAN_RPM_MAX = 10000;

/** Process — max time beyond the program (seconds). */
export const CONFIG_EXTRA_TIME_MIN = 0;
export const CONFIG_EXTRA_TIME_MAX = 3600;

/** Supply-voltage thresholds (V). */
export const CONFIG_VOLTAGE_MIN = 0;
export const CONFIG_VOLTAGE_MAX = 300;

/** Network text fields (IP / mask / gateway / DNS) — max characters. */
export const NETWORK_FIELD_MAX_LENGTH = 15;

/** User name — min/max characters. Allowed charset (letters, digits and the dot) lives in
 *  `sanitizeUsername`/`isValidUsername` in lib/users.ts. */
export const USER_NAME_MIN_LENGTH = 3;
export const USER_NAME_MAX_LENGTH = 40;

/** Password — min/max characters. The max is BCrypt's 72-byte limit; we deliberately do NOT
 *  restrict which characters are allowed (restricting symbols weakens passwords, annoys users and
 *  breaks password managers). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** E-mail address — maximum characters (RFC 5321 limit). */
export const EMAIL_MAX_LENGTH = 254;

// --- API paging (list fetch sizes) ----------------------------------------------------
/** Programs — page size when loading the full catalog into the client cache. */
export const PROGRAM_LIST_PAGE_SIZE = 100;
/** Programs — backend caps a programs page at 100 (DomainConstants.ProgramPageSizeMax). */
export const PROGRAM_PAGE_SIZE_MAX = 100;
/** Programs — debounce the Programas search box (ms). */
export const PROGRAM_SEARCH_DEBOUNCE_MS = 300;
/** Reports — page size when fetching execution/change/error lists for the tables. */
export const REPORT_PAGE_SIZE = 200;
/** System log — page size when fetching entries for the modal. */
export const SYSTEM_LOG_PAGE_SIZE = 200;

// --- Conexão (timeouts em ms) ---------------------------------------------------------
/** Tempo máximo de uma requisição REST antes de abortar e reportar "servidor não respondeu". */
export const API_TIMEOUT_MS = 12000;
/** Tempo que o app espera no carregamento (validação de sessão) antes de mostrar erro de conexão. */
export const APP_BOOT_TIMEOUT_MS = 12000;
/** Intervalo entre buscas do feed de notificações no servidor (REST polling — sem SignalR). */
export const NOTIFICATION_POLL_MS = 30000;
/** Intervalo entre buscas do status do sistema (rede / servidor central) na TopBar. */
export const SYSTEM_STATUS_POLL_MS = 20000;

// --- Logger ---------------------------------------------------------------------------
/** Máximo de entradas mantidas no buffer em memória do logger (console + visualizador futuro). */
export const LOG_RING_MAX = 500;

// --- Notificações ---------------------------------------------------------------------
/** Máximo de notificações mantidas (badge do sino + tela de Notificações). */
export const NOTIFICATION_MAX_ITEMS = 50;

// --- Diagnóstico (statistics rankings) -------------------------------------------------

/** How many entries the "top users / top programs" rankings can show (operator-adjustable). */
export const DIAG_RANK_MIN = 3;
export const DIAG_RANK_MAX = 10;
export const DIAG_RANK_DEFAULT = 5;

// --- Execução (live run) ---------------------------------------------------------------

/** Max samples kept in the live measured trace; it is decimated past this so a long run
 *  can't grow the array (and the re-rendered chart path) without bound. */
export const RUN_MEASURED_MAX_POINTS = 600;

// --- Calibração (secret technician menu) -----------------------------------------------

/** Thermocouple temperature offset (°C). */
export const CALIB_THERMO_OFFSET_MIN = -20;
export const CALIB_THERMO_OFFSET_MAX = 20;

/** Current-sensor zero offset (A). */
export const CALIB_CURRENT_OFFSET_MIN = -5;
export const CALIB_CURRENT_OFFSET_MAX = 5;

/** Sensor gain (%). */
export const CALIB_GAIN_MIN = 50;
export const CALIB_GAIN_MAX = 150;

/** Fan PWM duty (%). */
export const CALIB_PWM_MIN = 0;
export const CALIB_PWM_MAX = 100;
