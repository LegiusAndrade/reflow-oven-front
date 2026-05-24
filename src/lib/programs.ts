/** A reflow temperature profile the user can select and run. */
export type Program = {
  id: string;
  /** Display name, e.g. "ReflowOven SMD 270ºC" */
  name: string;
  /** How many times this profile has been run */
  runCount: number;
  /** Last execution date, already formatted for display */
  lastUsed: string;
};

/** Placeholder programs until profiles are persisted/loaded. */
export const MOCK_PROGRAMS: Program[] = [
  { id: "smd-270", name: "ReflowOven SMD 270ºC", runCount: 23, lastUsed: "01/03/1993" },
  { id: "smd-lead-free", name: "SMD Sem Chumbo 245ºC", runCount: 8, lastUsed: "12/04/2026" },
  { id: "test-large-board", name: "Teste Placa Grande", runCount: 2, lastUsed: "20/05/2026" },
];
