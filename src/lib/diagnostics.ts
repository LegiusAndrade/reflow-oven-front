/**
 * Diagnóstico statistics derived from the existing stores (users, programs). Pure and deterministic
 * so the server and client render the same numbers. The authoritative counts and rankings (login
 * counts, fault counters, top users) come from the backend overview — see DiagnosticoStats; these
 * helpers only summarize what the client already holds. Nothing here is synthesized/fabricated.
 */

import type { Program } from "./programs";
import type { User } from "./users";

export type UserStats = { total: number; active: number; inactive: number; admins: number; regular: number };
export type ProgramStats = { total: number; totalRuns: number };
export type RankedProgram = { id: string; name: string; runCount: number };

export function userStats(users: User[]): UserStats {
  const active = users.filter((u) => u.status === "Ativo").length;
  const admins = users.filter((u) => u.type === "Admin").length;
  return { total: users.length, active, inactive: users.length - active, admins, regular: users.length - admins };
}

export function programStats(programs: Program[]): ProgramStats {
  return { total: programs.length, totalRuns: programs.reduce((sum, p) => sum + p.runCount, 0) };
}

/** Top-N programs by run count (descending). */
export function topProgramsByRuns(programs: Program[], n: number): RankedProgram[] {
  return programs
    .map((p) => ({ id: p.id, name: p.name, runCount: p.runCount }))
    .sort((a, b) => b.runCount - a.runCount)
    .slice(0, n);
}
