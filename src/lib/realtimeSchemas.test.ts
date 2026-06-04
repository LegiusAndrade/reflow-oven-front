import { describe, expect, it } from "vitest";
import { parseRunPhase, parseRunStatus, parseSensorReadings, parseTraceSample } from "./realtimeSchemas";

const reading = { boardTempC: 30, boardFanRpm: 2000, ovenTempC: 197, ovenFanRpm: 1500, voltageV: 110, currentA: 20 };
const sample = { t: 5, alvo: 100, oven: 98, board: 30, current: 10, voltage: 110, ovenFan: 2000, boardFan: 1500 };

describe("parseSensorReadings", () => {
  it("accepts a well-formed reading", () => {
    expect(parseSensorReadings(reading)).toEqual(reading);
  });

  it("rejects NaN / Infinity (a misbehaving board must not poison a gauge)", () => {
    expect(parseSensorReadings({ ...reading, ovenTempC: Number.NaN })).toBeNull();
    expect(parseSensorReadings({ ...reading, currentA: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it("rejects a missing field or a wrong type", () => {
    expect(parseSensorReadings({ ...reading, voltageV: undefined })).toBeNull();
    expect(parseSensorReadings({ ...reading, ovenTempC: "197" })).toBeNull();
  });

  it("rejects null / non-object garbage", () => {
    expect(parseSensorReadings(null)).toBeNull();
    expect(parseSensorReadings("nope")).toBeNull();
  });
});

describe("parseTraceSample", () => {
  it("accepts a valid sample and rejects NaN", () => {
    expect(parseTraceSample(sample)).toEqual(sample);
    expect(parseTraceSample({ ...sample, oven: Number.NaN })).toBeNull();
  });
});

describe("parseRunPhase / parseRunStatus", () => {
  it("accepts known values and rejects unknown ones", () => {
    expect(parseRunPhase("Aquecimento")).toBe("Aquecimento");
    expect(parseRunPhase("Foo")).toBeNull();
    expect(parseRunStatus("running")).toBe("running");
    expect(parseRunStatus("paused")).toBeNull();
  });
});
