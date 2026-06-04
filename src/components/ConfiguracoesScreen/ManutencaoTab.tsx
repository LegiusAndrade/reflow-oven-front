"use client";

import { useEffect, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { api, ApiError, type MaintenanceOverviewDto } from "@/lib/api";
import { sessionStore } from "@/lib/auth";
import { formatBytes } from "@/lib/maintenance";
import { DbCleanupModal } from "./DbCleanupModal";
import { FactoryResetModal } from "./FactoryResetModal";

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className='flex items-start gap-3'>
      <IconGeneral icon={icon} fill={0} className='mt-0.5 shrink-0 text-[var(--brand)] [--icon-size:1.5rem]' />
      <div className='min-w-0'>
        <dt className='text-sm opacity-70'>{label}</dt>
        <dd className='font-semibold tabular-nums'>{value}</dd>
      </div>
    </div>
  );
}

/** Diagnóstico → Manutenção sub-tab: real storage/system info + database cleanup and factory reset. */
export function ManutencaoTab() {
  const [overview, setOverview] = useState<MaintenanceOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  // Frontend-known counts the overview doesn't report yet (programs, active users) — passed to the
  // cleanup modal so the Master sees their QUANTITY instead of "vazio" while backend #5 is pending.
  const [fallbackCounts, setFallbackCounts] = useState<{ programas?: number; usuarios?: number }>({});

  // Fetch the real overview (DB size + per-category counts + host disk/OS). Re-runs on `refresh()`,
  // e.g. after a cleanup. setState only after the await — keeps clear of react-hooks/set-state-in-effect.
  useEffect(() => {
    let alive = true;
    async function load(): Promise<void> {
      try {
        const ov = await api.maintenanceOverview();
        if (!alive) return;
        setOverview(ov);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : "Falha ao carregar o estado do sistema.");
      }
      // Frontend-known counts for the cleanup modal while the overview doesn't report programs/active
      // users (backend #5) — best-effort, so a failure here never blocks the page.
      try {
        const [progs, users] = await Promise.all([api.listPrograms({ page: 1, pageSize: 1 }), api.listUsers()]);
        if (!alive) return;
        const selfId = sessionStore.get()?.id;
        const usuarios = users.filter((u) => u.status === "Ativo" && u.id !== selfId).length;
        setFallbackCounts({ programas: progs.total, usuarios });
      } catch {
        /* best-effort — leave the fallback counts as-is */
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  const dbSize = overview ? formatBytes(overview.database.totalBytes) : "—";
  const freePct = overview && overview.diskTotalGB > 0 ? Math.round((overview.diskFreeGB / overview.diskTotalGB) * 100) : 0;
  const disk = overview ? `${overview.diskFreeGB} GB de ${overview.diskTotalGB} GB (${freePct}%)` : "—";

  return (
    <div className='flex flex-col gap-5'>
      {/* Storage + system info */}
      <section className='flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] p-4'>
        <header className='flex items-center gap-2 border-b border-[var(--border)] pb-2'>
          <IconGeneral icon='dns' fill={1} className='text-[var(--brand)] [--icon-size:1.5rem]' />
          <h3 className='font-semibold'>Sistema</h3>
        </header>
        {error && !overview ? (
          <p className='flex items-center gap-2 text-sm text-red-700 dark:text-red-400'>
            <IconGeneral icon='error' fill={1} className='shrink-0 [--icon-size:1.25rem]' />
            {error}
          </p>
        ) : (
          <dl className='grid gap-x-8 gap-y-3 sm:grid-cols-2'>
            <InfoRow icon='database' label='Tamanho do banco de dados' value={dbSize} />
            <InfoRow icon='hard_drive' label='Espaço livre no HD' value={disk} />
            <InfoRow icon='terminal' label='Sistema operacional' value={overview?.os ?? "—"} />
            <InfoRow icon='memory' label='Versão do Linux' value={overview?.osKernel ?? "—"} />
          </dl>
        )}
      </section>

      {/* Destructive actions */}
      <section>
        <h3 className='mb-2 font-semibold'>Ações</h3>
        <div className='flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => {
              refresh();
              setCleanupOpen(true);
            }}
            className='btn-press flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 font-semibold'
          >
            <IconGeneral icon='delete_sweep' fill={0} className='[--icon-size:1.25rem]' />
            Limpeza do banco
          </button>
          <button
            type='button'
            onClick={() => setResetOpen(true)}
            className='btn-press flex cursor-pointer items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2.5 font-semibold text-red-700 dark:text-red-400 hover:bg-red-500/10'
          >
            <IconGeneral icon='restart_alt' fill={0} className='[--icon-size:1.25rem]' />
            Reset de fábrica
          </button>
        </div>
      </section>

      <DbCleanupModal
        open={cleanupOpen}
        onClose={() => setCleanupOpen(false)}
        categories={overview?.database.categories ?? null}
        fallbackCounts={fallbackCounts}
        onCleaned={refresh}
      />
      <FactoryResetModal open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}
