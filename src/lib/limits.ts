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

/** User name — min/max characters. */
export const USER_NAME_MIN_LENGTH = 3;
export const USER_NAME_MAX_LENGTH = 40;

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
