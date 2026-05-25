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

/** A reflow temperature profile the user can select and run. */
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

/** A reflow-shaped curve (ramp → soak → peak → cooldown) derived from a peak/duration. */
function genProfile(peak: number, totalSec: number): ProfilePoint[] {
  const at = (frac: number, temp: number) => ({ t: Math.round(totalSec * frac), temp: Math.round(temp) });
  return [
    { t: 0, temp: 25 },
    at(0.2, peak * 0.55),
    at(0.42, peak * 0.7),
    at(0.55, peak * 0.85),
    at(0.62, peak),
    at(0.72, peak * 0.8),
    at(0.86, peak * 0.45),
    at(1, 40),
  ];
}

/** A few hand-crafted profiles. */
const BASE_PROGRAMS: Program[] = [
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
  {
    id: "adhesive-cure",
    name: "Cura de Adesivo 120ºC",
    runCount: 5,
    lastUsed: "03/05/2026",
    profile: [
      { t: 0, temp: 25 },
      { t: 60, temp: 80 },
      { t: 150, temp: 120 },
      { t: 300, temp: 120 },
      { t: 380, temp: 60 },
      { t: 440, temp: 35 },
    ],
  },
  {
    id: "bga-rework",
    name: "BGA Rework 250ºC",
    runCount: 12,
    lastUsed: "18/05/2026",
    profile: [
      { t: 0, temp: 25 },
      { t: 90, temp: 150 },
      { t: 180, temp: 200 },
      { t: 230, temp: 235 },
      { t: 260, temp: 250 },
      { t: 290, temp: 215 },
      { t: 360, temp: 120 },
      { t: 420, temp: 50 },
    ],
  },
  {
    id: "preheat-90",
    name: "Pré-aquecimento 90ºC",
    runCount: 41,
    lastUsed: "22/05/2026",
    profile: [
      { t: 0, temp: 25 },
      { t: 120, temp: 90 },
      { t: 300, temp: 90 },
      { t: 400, temp: 45 },
    ],
  },
];

const TYPES = ["SMD", "BGA", "QFN", "Sem Chumbo", "Cura", "Reballing", "Teste", "Pré-aquec."];

/** Deterministically generated fillers so the gallery/pagination has plenty to show. */
const GENERATED_PROGRAMS: Program[] = Array.from({ length: 44 }, (_, i) => {
  const peak = 110 + ((i * 17) % 170); // 110–279 °C
  const totalSec = 280 + ((i * 53) % 320); // 280–599 s
  const type = TYPES[i % TYPES.length];
  const day = String((i % 28) + 1).padStart(2, "0");
  const month = String((i % 12) + 1).padStart(2, "0");
  return {
    id: `gen-${i + 1}`,
    name: `${type} ${peak}ºC`,
    runCount: (i * 7) % 95,
    lastUsed: `${day}/${month}/2026`,
    profile: genProfile(peak, totalSec),
  };
});

/** Placeholder programs until profiles are persisted/loaded (~50 for testing). */
export const MOCK_PROGRAMS: Program[] = [...BASE_PROGRAMS, ...GENERATED_PROGRAMS];
