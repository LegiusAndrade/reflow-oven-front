/**
 * Helpers for numeric <input> fields: keep typed and pasted values within [min, max].
 * Centralizes the clamp + paste rules so a bound lives in one place (the constants in limits.ts)
 * and every numeric field behaves the same — see the "Limits" convention in CLAUDE.md.
 */

/** Clamp n into [min, max]; a non-finite n falls back to min. */
export const clampToRange = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

/** Parse a pasted string and clamp it into [min, max]; null when it isn't a finite number. */
export function parseClampedPaste(text: string, min: number, max: number): number | null {
  const n = Number(text.trim());
  return Number.isFinite(n) ? clampToRange(n, min, max) : null;
}
