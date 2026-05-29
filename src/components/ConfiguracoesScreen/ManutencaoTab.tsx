"use client";

import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useStore } from "@/hooks/useStore";
import { DEVICE_INFO } from "@/lib/deviceInfo";
import { cleanupStore, databaseSizeBytes, formatBytes } from "@/lib/maintenance";
import { usersStore } from "@/lib/users";
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

/** Diagnóstico → Manutenção sub-tab: storage/system info + database cleanup and factory reset. */
export function ManutencaoTab() {
  const users = useStore(usersStore);
  const cleared = useStore(cleanupStore);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const d = DEVICE_INFO;
  const dbSize = databaseSizeBytes(cleared, users);
  const freePct = Math.round((d.storageFreeGB / d.storageTotalGB) * 100);

  return (
    <div className='flex flex-col gap-5'>
      {/* Storage + system info */}
      <section className='flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4'>
        <header className='flex items-center gap-2 border-b border-white/10 pb-2'>
          <IconGeneral icon='dns' fill={1} className='text-[var(--brand)] [--icon-size:1.5rem]' />
          <h3 className='font-semibold'>Sistema</h3>
        </header>
        <dl className='grid gap-x-8 gap-y-3 sm:grid-cols-2'>
          <InfoRow icon='database' label='Tamanho do banco de dados' value={formatBytes(dbSize)} />
          <InfoRow icon='hard_drive' label='Espaço livre no HD' value={`${d.storageFreeGB} GB de ${d.storageTotalGB} GB (${freePct}%)`} />
          <InfoRow icon='terminal' label='Sistema operacional' value={d.os.name} />
          <InfoRow icon='memory' label='Versão do Linux' value={d.os.kernel} />
        </dl>
      </section>

      {/* Destructive actions */}
      <section>
        <h3 className='mb-2 font-semibold'>Ações</h3>
        <div className='flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => setCleanupOpen(true)}
            className='btn-press flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 font-semibold'
          >
            <IconGeneral icon='delete_sweep' fill={0} className='[--icon-size:1.25rem]' />
            Limpeza do banco
          </button>
          <button
            type='button'
            onClick={() => setResetOpen(true)}
            className='btn-press flex cursor-pointer items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2.5 font-semibold text-red-400 hover:bg-red-500/10'
          >
            <IconGeneral icon='restart_alt' fill={0} className='[--icon-size:1.25rem]' />
            Reset de fábrica
          </button>
        </div>
      </section>

      <DbCleanupModal open={cleanupOpen} onClose={() => setCleanupOpen(false)} />
      <FactoryResetModal open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}
