// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { canAccess, canAdminister, canManagePrograms, isMaster } from "./auth";

// The role gates decide who reaches which route and who can mutate programs — security-critical, and
// pure (role + pathname in, boolean out), so they're cheap to pin down.

describe("canAdminister", () => {
  it("is true for Admin and Master, false for Regular and Tecnico", () => {
    expect(canAdminister("Admin")).toBe(true);
    expect(canAdminister("Master")).toBe(true);
    expect(canAdminister("Regular")).toBe(false);
    expect(canAdminister("Tecnico")).toBe(false);
  });
});

describe("isMaster", () => {
  it("is true only for the Master superuser", () => {
    expect(isMaster("Master")).toBe(true);
    expect(isMaster("Admin")).toBe(false);
    expect(isMaster("Regular")).toBe(false);
    expect(isMaster("Tecnico")).toBe(false);
  });
});

describe("canManagePrograms", () => {
  it("allows only Admin/Master to mutate programs", () => {
    expect(canManagePrograms("Admin")).toBe(true);
    expect(canManagePrograms("Master")).toBe(true);
    expect(canManagePrograms("Regular")).toBe(false);
    expect(canManagePrograms("Tecnico")).toBe(false);
  });
});

describe("canAccess", () => {
  it("lets Admin and Master reach every route", () => {
    for (const route of ["/", "/programas", "/relatorios", "/configuracoes", "/informacao", "/notificacoes"]) {
      expect(canAccess("Admin", route)).toBe(true);
      expect(canAccess("Master", route)).toBe(true);
    }
  });

  it("limits a Regular user to home, programas and notificacoes", () => {
    expect(canAccess("Regular", "/")).toBe(true);
    expect(canAccess("Regular", "/programas")).toBe(true);
    expect(canAccess("Regular", "/notificacoes")).toBe(true);
    expect(canAccess("Regular", "/relatorios")).toBe(false);
    expect(canAccess("Regular", "/configuracoes")).toBe(false);
    expect(canAccess("Regular", "/informacao")).toBe(false);
  });

  it("lets a calibration session reach Configurações (for Calibração), but no other admin route", () => {
    expect(canAccess("Tecnico", "/configuracoes", true)).toBe(true);
    expect(canAccess("Tecnico", "/configuracoes", false)).toBe(false);
    expect(canAccess("Tecnico", "/relatorios", true)).toBe(false);
    expect(canAccess("Tecnico", "/", true)).toBe(true);
  });
});
