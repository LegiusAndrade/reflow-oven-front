"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useSession } from "@/hooks/useSession";
import { useStore } from "@/hooks/useStore";
import { api } from "@/lib/api";
import { isMaster } from "@/lib/auth";
import { userStats } from "@/lib/diagnostics";
import { DIAG_RANK_DEFAULT, DIAG_RANK_MAX, DIAG_RANK_MIN } from "@/lib/limits";
import type { ErrorSeverity } from "@/lib/reports";
import { usersStore } from "@/lib/users";

type Overview = {
  stats: { programs: number; executions: number; failures: number; activeUsers: number; inactiveUsers: number; admins: number };
  faultsByType: { code: string; severity: ErrorSeverity; message: string; count: number }[];
  topUsers: { id: string; name: string; logins: number }[];
  topPrograms: { id: string; name: string; runCount: number }[];
};

/** Severity → text/fill colors for the fault chips. */
const SEVERITY_STYLE: Record<ErrorSeverity, string> = {
  Crítico: "text-red-700 dark:text-red-400 bg-red-400/15",
  Alerta: "text-amber-700 dark:text-amber-400 bg-amber-400/15",
  Aviso: "text-sky-700 dark:text-sky-400 bg-sky-400/15",
};

function StatCard({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-(--border) p-3'>
      <IconGeneral icon={icon} fill={0} className='shrink-0 text-(--brand) [--icon-size:1.75rem]' />
      <div className='min-w-0'>
        <p className='truncate text-sm opacity-70'>{label}</p>
        <p className='text-xl font-semibold tabular-nums'>{value}</p>
      </div>
    </div>
  );
}

/** A bounded -/+ stepper for the ranking size. */
function Stepper({ value, onChange }: { value: number; onChange: (_v: number) => void }) {
  const btn = "btn-press grid size-7 cursor-pointer place-items-center rounded-lg border border-(--border) disabled:cursor-not-allowed disabled:opacity-40";
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
type RankStatus = "loading" | "failed" | "ready";

/** A ranking block: title + Top-N stepper + a list of bars proportional to the leader. While the API
 *  overview loads it shows skeleton bars; on failure a message + retry — never a fabricated ranking. */
function RankCard({
  icon,
  title,
  unit,
  rows,
  count,
  onCount,
  status,
  onRetry,
}: {
  icon: string;
  title: string;
  unit: string;
  rows: RankRow[];
  count: number;
  onCount: (_v: number) => void;
  status: RankStatus;
  onRetry: () => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className='flex flex-col gap-3 rounded-xl border border-(--border) bg-(--surface-inset) p-4'>
      <header className='flex items-center gap-2 border-b border-(--border) pb-2'>
        <IconGeneral icon={icon} fill={1} className='text-(--brand) [--icon-size:1.5rem]' />
        <h4 className='flex-1 font-semibold'>{title}</h4>
        <Stepper value={count} onChange={onCount} />
      </header>
      {status === "loading" ? (
        <div className='flex flex-col gap-2.5'>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className='flex items-center gap-3'>
              <span className='w-4 shrink-0 text-right text-sm opacity-30 tabular-nums'>{i + 1}</span>
              <div className='h-4 flex-1 animate-pulse rounded bg-(--surface-2)' />
            </div>
          ))}
        </div>
      ) : status === "failed" ? (
        <div className='flex flex-col items-start gap-2 py-2 text-sm opacity-70'>
          <span>Não foi possível carregar.</span>
          <button
            type='button'
            onClick={onRetry}
            className='btn-press flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--border) px-3 py-1.5 font-medium'
          >
            <IconGeneral icon='refresh' fill={0} className='[--icon-size:1.125rem]' />
            Tentar novamente
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className='py-2 text-sm opacity-60'>Sem dados.</p>
      ) : (
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
                <div className='mt-1 h-1.5 overflow-hidden rounded-full bg-(--surface-2)'>
                  <div className='h-full rounded-full bg-(--brand)' style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Diagnóstico statistics: overview counts, faults by type, and the two adjustable rankings. */
export function DiagnosticoStats() {
  const users = useStore(usersStore);
  // The Master also gets a "Usuários deletados" (trash) card; its count comes from the MasterOnly endpoint.
  const master = isMaster(useSession()?.role ?? "Regular");
  const [deletedUsers, setDeletedUsers] = useState(0);
  const [userN, setUserN] = useState(DIAG_RANK_DEFAULT);
  const [progN, setProgN] = useState(DIAG_RANK_DEFAULT);
  const [ov, setOv] = useState<Overview | null>(null);
  const [ovFailed, setOvFailed] = useState(false);

  // Authoritative counts/rankings/faults from the API. On failure we show an explicit failed state
  // with retry — never a fabricated ranking synthesized from a hash (the old silent fallback). State is
  // only set in the async then/catch (not synchronously) so the effect stays off the cascading-render path.
  const loadOverview = useCallback(() => {
    api
      .diagnosticsOverview(DIAG_RANK_MAX)
      .then((d) => {
        setOv(d as Overview);
        setOvFailed(false);
      })
      .catch(() => setOvFailed(true));
  }, []);
  useEffect(() => loadOverview(), [loadOverview]);

  // Deleted-users count for the Master's extra card (MasterOnly endpoint — only fetched as the Master).
  useEffect(() => {
    if (!master) return;
    api
      .listDeletedUsers()
      .then((d) => setDeletedUsers(d.length))
      .catch(() => {});
  }, [master]);

  const us = useMemo(() => userStats(users), [users]);

  // Programs/executions are catalog-wide stats: the programs store is now page-scoped (server-side
  // pagination), so these come from the API overview only — never derived from the visible page.
  const programsCount = ov?.stats.programs ?? 0;
  const executions = ov?.stats.executions ?? 0;
  // User counts come from the users store (the full list, with the Master excluded) so they match the
  // Usuários screen — the API overview counts the Master in activeUsers, which the screen doesn't.
  const activeUsers = us.active;
  const inactiveUsers = us.inactive;
  const admins = ov?.stats.admins ?? us.admins;

  const faults = ov?.faultsByType ?? [];
  const totalFaults = ov?.stats.failures ?? faults.reduce((sum, f) => sum + f.count, 0);
  const maxFault = Math.max(1, ...faults.map((f) => f.count));
  // No synthesized fallback: empty until the API answers. The RankCards show loading/failed states.
  const topUsers = (ov?.topUsers ?? []).slice(0, userN);
  const topProgs = (ov?.topPrograms ?? []).slice(0, progN);
  const rankStatus: RankStatus = ovFailed ? "failed" : ov === null ? "loading" : "ready";

  return (
    <section className='flex flex-col gap-4'>
      {/* Overview counts */}
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        <StatCard icon='article' label='Programas cadastrados' value={programsCount} />
        <StatCard icon='play_circle' label='Execuções totais' value={executions} />
        <StatCard icon='error' label='Falhas registradas' value={totalFaults} />
        <StatCard icon='person' label='Usuários ativos' value={activeUsers} />
        <StatCard icon='person_off' label='Usuários inativos' value={inactiveUsers} />
        {master && <StatCard icon='person_remove' label='Usuários deletados' value={deletedUsers} />}
        <StatCard icon='shield_person' label='Administradores' value={admins} />
      </div>

      {/* Faults by type */}
      <div className='flex flex-col gap-3 rounded-xl border border-(--border) bg-(--surface-inset) p-4'>
        <header className='flex items-center gap-2 border-b border-(--border) pb-2'>
          <IconGeneral icon='report' fill={1} className='text-(--brand) [--icon-size:1.5rem]' />
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
                <div className='mt-1 h-1.5 overflow-hidden rounded-full bg-(--surface-2)'>
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
          status={rankStatus}
          onRetry={loadOverview}
          rows={topUsers.map((u) => ({ id: u.id, name: u.name, value: u.logins }))}
        />
        <RankCard
          icon='trending_up'
          title='Programas mais usados'
          unit='exec.'
          count={progN}
          onCount={setProgN}
          status={rankStatus}
          onRetry={loadOverview}
          rows={topProgs.map((p) => ({ id: p.id, name: p.name, value: p.runCount }))}
        />
      </div>
    </section>
  );
}
