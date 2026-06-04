/**
 * Helpers for numeric <input> fields: keep typed and pasted values within [min, max].
 * Centralizes the clamp + paste rules so a bound lives in one place (the constants in limits.ts)
 * and every numeric field behaves the same — see the "Limits" convention in CLAUDE.md.
 */

/** Clamp n into [min, max]; a non-finite n falls back to min. */
export const clampToRange = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

/** Round n to at most `decimals` decimal places (e.g. 30.555 → 30.56); a non-finite n is returned
 *  unchanged. Use to cap a value's precision before persisting it (see PROGRAM_VALUE_MAX_DECIMALS). */
export const roundToDecimals = (n: number, decimals: number): number => {
  if (!Number.isFinite(n)) return n;
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};

/** Parse a pasted string and clamp it into [min, max]; null when it isn't a finite number. */
export function parseClampedPaste(text: string, min: number, max: number): number | null {
  const n = Number(text.trim());
  return Number.isFinite(n) ? clampToRange(n, min, max) : null;
}
