/**
 * Diagnóstico statistics — derived from the existing stores (users, programs) plus the fault
 * catalog. Pure and deterministic so the server and client render the same numbers; where a
 * real metric doesn't exist yet (per-user login counts, lifetime fault counters) the value is
 * synthesized from a stable hash. TODO(backend): replace the synthesized counts with real ones.
 */

import type { Program } from "./programs";
import { FAULT_CATALOG, type ErrorSeverity } from "./reports";
import type { User } from "./users";

export type UserStats = { total: number; active: number; inactive: number; admins: number; regular: number };
export type ProgramStats = { total: number; totalRuns: number };
export type FaultStat = { code: string; severity: ErrorSeverity; message: string; count: number };
export type RankedUser = { id: string; name: string; type: User["type"]; logins: number };
export type RankedProgram = { id: string; name: string; runCount: number };

/** Stable 32-bit FNV-1a hash of a string — used to synthesize deterministic mock counts. */
function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function userStats(users: User[]): UserStats {
  const active = users.filter((u) => u.status === "Ativo").length;
  const admins = users.filter((u) => u.type === "Admin").length;
  return { total: users.length, active, inactive: users.length - active, admins, regular: users.length - admins };
}

export function programStats(programs: Program[]): ProgramStats {
  return { total: programs.length, totalRuns: programs.reduce((sum, p) => sum + p.runCount, 0) };
}

/** Synthesized lifetime login count for a user (Admins log in more; inactive far fewer). */
export function loginCount(user: User): number {
  const base = 15 + (strHash(user.id) % 240); // 15..254
  const total = base + (user.type === "Admin" ? 80 : 0);
  return user.status === "Inativo" ? Math.round(total * 0.2) : total;
}

/** Top-N users by login count (descending). */
export function topUsersByLogins(users: User[], n: number): RankedUser[] {
  return users
    .map((u) => ({ id: u.id, name: u.name, type: u.type, logins: loginCount(u) }))
    .sort((a, b) => b.logins - a.logins)
    .slice(0, n);
}

/** Top-N programs by run count (descending). */
export function topProgramsByRuns(programs: Program[], n: number): RankedProgram[] {
  return programs
    .map((p) => ({ id: p.id, name: p.name, runCount: p.runCount }))
    .sort((a, b) => b.runCount - a.runCount)
    .slice(0, n);
}

/** Synthesized lifetime occurrence count per fault type (warnings common, criticals rare). */
const SEVERITY_BASE: Record<ErrorSeverity, number> = { Crítico: 1, Alerta: 6, Aviso: 14 };

/** Count of each fault type, descending (TODO(backend): read the board's real fault counters). */
export function faultStats(): FaultStat[] {
  return FAULT_CATALOG.map((f) => ({
    code: f.code,
    severity: f.severity,
    message: f.message,
    count: SEVERITY_BASE[f.severity] + (strHash(f.code) % 25),
  })).sort((a, b) => b.count - a.count);
}
