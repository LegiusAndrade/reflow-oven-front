import { describe, expect, it } from "vitest";
import { changePasswordResultSchema, notificationsSchema, pagedProgramsSchema, runStatusSchema, sessionSchema } from "./apiSchemas";

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

describe("changePasswordResultSchema", () => {
  it("accepts the fresh token + session minted after a self password-change", () => {
    const result = { ok: true, token: "jwt-novo", expiresAt: "2026-07-03T20:00:00Z", session };
    expect(changePasswordResultSchema.safeParse(result).success).toBe(true);
  });

  it("rejects the legacy { ok } shape (no fresh token/session)", () => {
    expect(changePasswordResultSchema.safeParse({ ok: true }).success).toBe(false);
  });
});

describe("notificationsSchema", () => {
  const notification = {
    id: "n1",
    kind: "warning",
    at: "2026-07-03T12:00:00Z",
    title: "Limpeza de retenção",
    message: "Registros antigos serão removidos na próxima varredura.",
    read: false,
  };

  it("accepts items with the deepLink absent, null, or set (the purge warning)", () => {
    expect(notificationsSchema.safeParse([notification]).success).toBe(true);
    expect(notificationsSchema.safeParse([{ ...notification, deepLink: null }]).success).toBe(true);
    expect(notificationsSchema.safeParse([{ ...notification, deepLink: { tab: "relatorios", until: "2026-06-03" } }]).success).toBe(true);
  });

  it("rejects an unknown deepLink tab or feed kind", () => {
    expect(notificationsSchema.safeParse([{ ...notification, deepLink: { tab: "programas", until: "2026-06-03" } }]).success).toBe(false);
    expect(notificationsSchema.safeParse([{ ...notification, kind: "critical" }]).success).toBe(false);
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
