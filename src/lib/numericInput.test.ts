import { describe, expect, it } from "vitest";
import { clampToRange, parseClampedPaste, roundToDecimals } from "./numericInput";

// These guard the values that ultimately reach the power board (temperatures, times, PID, etc.), so
// the clamp/round rules are worth pinning down.

describe("clampToRange", () => {
  it("keeps a value already inside the range", () => {
    expect(clampToRange(50, 0, 100)).toBe(50);
    expect(clampToRange(0, 0, 100)).toBe(0);
    expect(clampToRange(100, 0, 100)).toBe(100);
  });

  it("clamps below min and above max", () => {
    expect(clampToRange(-10, 0, 100)).toBe(0);
    expect(clampToRange(150, 0, 100)).toBe(100);
    expect(clampToRange(20, 50, 100)).toBe(50);
  });

  it("falls back to min for a non-finite value", () => {
    expect(clampToRange(NaN, 5, 100)).toBe(5);
    expect(clampToRange(Infinity, 5, 100)).toBe(5);
    expect(clampToRange(-Infinity, 5, 100)).toBe(5);
  });
});

describe("roundToDecimals", () => {
  it("caps precision at the requested decimals", () => {
    expect(roundToDecimals(197.249, 2)).toBe(197.25);
    expect(roundToDecimals(30.123, 2)).toBe(30.12);
    expect(roundToDecimals(99.999, 2)).toBe(100);
    expect(roundToDecimals(2.5, 0)).toBe(3);
  });

  it("leaves a value with fewer decimals unchanged", () => {
    expect(roundToDecimals(150, 2)).toBe(150);
    expect(roundToDecimals(12.3, 2)).toBe(12.3);
  });

  it("returns a non-finite value unchanged", () => {
    expect(roundToDecimals(Number.NaN, 2)).toBeNaN();
    expect(roundToDecimals(Number.POSITIVE_INFINITY, 2)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("parseClampedPaste", () => {
  it("parses, trims and clamps a numeric paste", () => {
    expect(parseClampedPaste("50", 0, 100)).toBe(50);
    expect(parseClampedPaste("  150  ", 0, 100)).toBe(100);
    expect(parseClampedPaste("-5", 0, 100)).toBe(0);
  });

  it("returns null for a non-numeric paste", () => {
    expect(parseClampedPaste("abc", 0, 100)).toBeNull();
    expect(parseClampedPaste("12px", 0, 100)).toBeNull();
  });
});
