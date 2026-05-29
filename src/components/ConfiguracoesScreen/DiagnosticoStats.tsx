"use client";

import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useAllPrograms } from "@/hooks/useAllPrograms";
import { useStore } from "@/hooks/useStore";
import { faultStats, programStats, topProgramsByRuns, topUsersByLogins, userStats } from "@/lib/diagnostics";
import { DIAG_RANK_DEFAULT, DIAG_RANK_MAX, DIAG_RANK_MIN } from "@/lib/limits";
import { cleanupStore } from "@/lib/maintenance";
import { MOCK_PROGRAMS } from "@/lib/programs";
import type { ErrorSeverity } from "@/lib/reports";
import { usersStore } from "@/lib/users";

/** Severity → text/fill colors for the fault chips. */
const SEVERITY_STYLE: Record<ErrorSeverity, string> = {
  Crítico: "text-red-400 bg-red-400/15",
  Alerta: "text-amber-400 bg-amber-400/15",
  Aviso: "text-sky-400 bg-sky-400/15",
};

function StatCard({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-white/10 p-3'>
      <IconGeneral icon={icon} fill={0} className='shrink-0 text-[var(--brand)] [--icon-size:1.75rem]' />
      <div className='min-w-0'>
        <p className='truncate text-sm opacity-70'>{label}</p>
        <p className='text-xl font-semibold tabular-nums'>{value}</p>
      </div>
    </div>
  );
}

/** A bounded -/+ stepper for the ranking size. */
function Stepper({ value, onChange }: { value: number; onChange: (_v: number) => void }) {
  const btn = "btn-press grid size-7 cursor-pointer place-items-center rounded-lg border border-white/15 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className='flex items-center gap-1'>
      <button type='button' aria-label='Mostrar menos' disabled={value <= DIAG_RANK_MIN} onClick={() => onChange(value - 1)} className={btn}>
        <IconGeneral icon='remove' fill={0} className='[--icon-size:1.125rem]' />
      </button>
      <span className='w-6 text-center text-sm font-semibold tabular-nums'>{value}</span>
      <button type='button' aria-label='Mostrar mais' disabled={value >= DIAG_RANK_MAX} onClick={() => onChange(value + 1)} className={btn}>
        <IconGeneral icon='add' fill={0} className='[--icon-size:1.125rem]' />
      </button>
    </div>
  );
}

type RankRow = { id: string; name: string; value: number; tag?: string };

/** A ranking block: title + Top-N stepper + a list of bars proportional to the leader. */
function RankCard({
  icon,
  title,
  unit,
  rows,
  count,
  onCount,
}: {
  icon: string;
  title: string;
  unit: string;
  rows: RankRow[];
  count: number;
  onCount: (_v: number) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className='flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4'>
      <header className='flex items-center gap-2 border-b border-white/10 pb-2'>
        <IconGeneral icon={icon} fill={1} className='text-[var(--brand)] [--icon-size:1.5rem]' />
        <h4 className='flex-1 font-semibold'>{title}</h4>
        <Stepper value={count} onChange={onCount} />
      </header>
      <ol className='flex flex-col gap-2.5'>
        {rows.map((r, i) => (
          <li key={r.id} className='flex items-center gap-3'>
            <span className='w-4 shrink-0 text-right text-sm font-semibold opacity-50 tabular-nums'>{i + 1}</span>
            <div className='min-w-0 flex-1'>
              <div className='flex items-baseline justify-between gap-2'>
                <span className='truncate'>
                  {r.name}
                  {r.tag && <span className='ml-2 text-xs opacity-50'>{r.tag}</span>}
                </span>
                <span className='shrink-0 text-sm font-semibold tabular-nums'>
                  {r.value} <span className='font-normal opacity-50'>{unit}</span>
                </span>
              </div>
              <div className='mt-1 h-1.5 overflow-hidden rounded-full bg-white/10'>
                <div className='h-full rounded-full bg-[var(--brand)]' style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Diagnóstico statistics: overview counts, faults by type, and the two adjustable rankings. */
export function DiagnosticoStats() {
  const users = useStore(usersStore);
  const programs = useAllPrograms(MOCK_PROGRAMS);
  const [userN, setUserN] = useState(DIAG_RANK_DEFAULT);
  const [progN, setProgN] = useState(DIAG_RANK_DEFAULT);

  const cleared = useStore(cleanupStore);
  const us = useMemo(() => userStats(users), [users]);
  const ps = useMemo(() => programStats(programs), [programs]);
  // The fault log can be wiped by a maintenance cleanup; mirror it here so the same screen agrees.
  const faults = useMemo(() => (cleared.falhas ? [] : faultStats()), [cleared.falhas]);
  const totalFaults = useMemo(() => faults.reduce((sum, f) => sum + f.count, 0), [faults]);
  const topUsers = useMemo(() => topUsersByLogins(users, userN), [users, userN]);
  const topProgs = useMemo(() => topProgramsByRuns(programs, progN), [programs, progN]);
  const maxFault = Math.max(1, ...faults.map((f) => f.count));

  return (
    <section className='flex flex-col gap-4'>
      {/* Overview counts */}
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        <StatCard icon='article' label='Programas cadastrados' value={ps.total} />
        <StatCard icon='play_circle' label='Execuções totais' value={ps.totalRuns} />
        <StatCard icon='error' label='Falhas registradas' value={totalFaults} />
        <StatCard icon='person' label='Usuários ativos' value={us.active} />
        <StatCard icon='person_off' label='Usuários inativos' value={us.inactive} />
        <StatCard icon='shield_person' label='Administradores' value={us.admins} />
      </div>

      {/* Faults by type */}
      <div className='flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4'>
        <header className='flex items-center gap-2 border-b border-white/10 pb-2'>
          <IconGeneral icon='report' fill={1} className='text-[var(--brand)] [--icon-size:1.5rem]' />
          <h4 className='font-semibold'>Falhas por tipo</h4>
        </header>
        {faults.length === 0 && <p className='py-2 text-sm opacity-60'>Nenhuma falha registrada.</p>}
        <ul className='flex flex-col gap-2.5'>
          {faults.map((f) => (
            <li key={f.code} className='flex items-center gap-3'>
              <span className={clsx("shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold", SEVERITY_STYLE[f.severity])}>{f.code}</span>
              <div className='min-w-0 flex-1'>
                <div className='flex items-baseline justify-between gap-2'>
                  <span className='truncate text-sm'>{f.message}</span>
                  <span className='shrink-0 text-sm font-semibold tabular-nums'>{f.count}</span>
                </div>
                <div className='mt-1 h-1.5 overflow-hidden rounded-full bg-white/10'>
                  <div
                    className={clsx(
                      "h-full rounded-full",
                      f.severity === "Crítico" ? "bg-red-400" : f.severity === "Alerta" ? "bg-amber-400" : "bg-sky-400"
                    )}
                    style={{ width: `${(f.count / maxFault) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Adjustable rankings */}
      <div className='grid gap-3 lg:grid-cols-2'>
        <RankCard
          icon='leaderboard'
          title='Usuários que mais logam'
          unit='logins'
          count={userN}
          onCount={setUserN}
          rows={topUsers.map((u) => ({ id: u.id, name: u.name, value: u.logins, tag: u.type === "Admin" ? "Admin" : undefined }))}
        />
        <RankCard
          icon='trending_up'
          title='Programas mais usados'
          unit='exec.'
          count={progN}
          onCount={setProgN}
          rows={topProgs.map((p) => ({ id: p.id, name: p.name, value: p.runCount }))}
        />
      </div>
    </section>
  );
}
