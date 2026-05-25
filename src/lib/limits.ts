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
