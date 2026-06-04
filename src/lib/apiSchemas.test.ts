import { describe, expect, it } from "vitest";
import { pagedProgramsSchema, runStatusSchema, sessionSchema } from "./apiSchemas";

const session = { id: "u1", name: "lucas.silva", role: "Admin", loginAt: 1_700_000_000_000, theme: "system" };
const program = { id: "p1", name: "QFN 197", runCount: 3, profile: [{ t: 0, temp: 25 }], favorite: false, canDelete: true };
const runStatus = {
  runId: "r1",
  programId: "p1",
  programName: "QFN",
  status: "running",
  phase: "Aquecimento",
  startedAt: "2026-06-04T00:00:00Z",
  elapsedSeconds: 5,
  totalSeconds: 600,
  progress: 0.01,
};

describe("sessionSchema", () => {
  it("accepts a valid session, with or without optional prefs", () => {
    expect(sessionSchema.safeParse(session).success).toBe(true);
    expect(sessionSchema.safeParse({ ...session, calibration: true, chartSeries: { oven: true } }).success).toBe(true);
  });

  it("rejects an unknown role or a missing required field", () => {
    expect(sessionSchema.safeParse({ ...session, role: "Root" }).success).toBe(false);
    expect(sessionSchema.safeParse({ id: session.id, name: session.name, role: session.role, loginAt: session.loginAt }).success).toBe(false);
  });
});

describe("pagedProgramsSchema", () => {
  it("accepts a page of programs", () => {
    expect(pagedProgramsSchema.safeParse({ items: [program], total: 1, page: 1, pageSize: 10 }).success).toBe(true);
  });

  it("rejects a malformed program inside the page", () => {
    expect(pagedProgramsSchema.safeParse({ items: [{ ...program, runCount: "3" }], total: 1, page: 1, pageSize: 10 }).success).toBe(false);
  });
});

describe("runStatusSchema", () => {
  it("accepts a valid run status", () => {
    expect(runStatusSchema.safeParse(runStatus).success).toBe(true);
  });

  it("rejects an unknown status or phase", () => {
    expect(runStatusSchema.safeParse({ ...runStatus, status: "paused" }).success).toBe(false);
    expect(runStatusSchema.safeParse({ ...runStatus, phase: "Cooling" }).success).toBe(false);
  });
});
