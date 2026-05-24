/** A single setpoint on a reflow profile curve. */
export type ProfilePoint = {
  /** Seconds since the start of the run */
  t: number;
  /** Target temperature at that instant, in °C */
  temp: number;
};

/** A reflow temperature profile the user can select and run. */
export type Program = {
  id: string;
  /** Display name, e.g. "ReflowOven SMD 270ºC" */
  name: string;
  /** How many times this profile has been run */
  runCount: number;
  /** Last execution date, already formatted for display */
  lastUsed: string;
  /** Setpoint curve (temperature × time), ordered by `t`. */
  profile: ProfilePoint[];
};

/** Placeholder programs until profiles are persisted/loaded. */
export const MOCK_PROGRAMS: Program[] = [
  {
    id: "smd-270",
    name: "ReflowOven SMD 270ºC",
    runCount: 23,
    lastUsed: "01/03/1993",
    profile: [
      { t: 0, temp: 25 },
      { t: 90, temp: 150 },
      { t: 180, temp: 180 },
      { t: 210, temp: 217 },
      { t: 240, temp: 270 },
      { t: 270, temp: 230 },
      { t: 330, temp: 120 },
      { t: 390, temp: 45 },
    ],
  },
  {
    id: "smd-lead-free",
    name: "SMD Sem Chumbo 245ºC",
    runCount: 8,
    lastUsed: "12/04/2026",
    profile: [
      { t: 0, temp: 25 },
      { t: 90, temp: 150 },
      { t: 180, temp: 175 },
      { t: 225, temp: 217 },
      { t: 255, temp: 245 },
      { t: 285, temp: 210 },
      { t: 345, temp: 110 },
      { t: 400, temp: 45 },
    ],
  },
  {
    id: "test-large-board",
    name: "Teste Placa Grande",
    runCount: 2,
    lastUsed: "20/05/2026",
    profile: [
      { t: 0, temp: 25 },
      { t: 120, temp: 120 },
      { t: 240, temp: 150 },
      { t: 300, temp: 180 },
      { t: 360, temp: 150 },
      { t: 450, temp: 80 },
      { t: 520, temp: 40 },
    ],
  },
];
