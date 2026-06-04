import { describe, expect, it } from "vitest";
import { mmss, phaseAt, tempAt, totalTime } from "./run";

// A small reflow curve: ramp → soak → peak → cooldown.
const profile = [
  { t: 0, temp: 25 },
  { t: 100, temp: 150 },
  { t: 200, temp: 150 },
  { t: 300, temp: 240 },
  { t: 400, temp: 25 },
];

describe("totalTime", () => {
  it("is the last point's time, and 0 for an empty profile", () => {
    expect(totalTime(profile)).toBe(400);
    expect(totalTime([])).toBe(0);
  });
});

describe("tempAt", () => {
  it("interpolates the setpoint linearly within a segment", () => {
    expect(tempAt(profile, 50)).toBe(87.5);
    expect(tempAt(profile, 150)).toBe(150);
  });

  it("clamps to the profile ends", () => {
    expect(tempAt(profile, -10)).toBe(25);
    expect(tempAt(profile, 1000)).toBe(25);
  });

  it("is 0 for an empty profile", () => {
    expect(tempAt([], 50)).toBe(0);
  });
});

describe("phaseAt", () => {
  it("classifies ramp / soak / peak / cooldown", () => {
    expect(phaseAt(profile, 50)).toBe("Aquecimento");
    expect(phaseAt(profile, 150)).toBe("Patamar");
    expect(phaseAt(profile, 300)).toBe("Pico");
    expect(phaseAt(profile, 360)).toBe("Resfriamento");
  });
});

describe("mmss", () => {
  it("formats seconds as m:ss and clamps negatives to 0:00", () => {
    expect(mmss(0)).toBe("0:00");
    expect(mmss(65)).toBe("1:05");
    expect(mmss(600)).toBe("10:00");
    expect(mmss(-5)).toBe("0:00");
  });
});
