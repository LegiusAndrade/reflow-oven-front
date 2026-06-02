/** A single setpoint on a reflow profile curve. */
export type ProfilePoint = {
  /** Seconds since the start of the run */
  t: number;
  /** Target temperature at that instant, in °C */
  temp: number;
};

/** Ramp shape between two setpoints in the editor. */
export type Ramp = "Linear" | "Fixo" | "Parábola positiva" | "Parábola negativa";

/** One editable leg of a profile — the editor's source of truth; `profile` is derived from these. */
export type ProfileSegment = {
  temp: number;
  durationSec: number;
  ramp: Ramp;
};

/** A reflow temperature profile the user can select and run. The data comes from the backend
 *  (see `programStore` → `api.listPrograms`); this module only declares the shared shape. */
export type Program = {
  id: string;
  /** Display name, e.g. "ReflowOven SMD 270ºC" */
  name: string;
  /** Optional longer description (shown in the editor). */
  description?: string;
  /** How many times this profile has been run */
  runCount: number;
  /** Last execution date, already formatted for display */
  lastUsed: string;
  /** Setpoint curve (temperature × time), ordered by `t`. */
  profile: ProfilePoint[];
  /** Editable segments the curve was built from (lets the editor round-trip losslessly). */
  segments?: ProfileSegment[];
};
