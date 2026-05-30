"use client";

import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import { useFavoriteIds } from "@/hooks/useFavoriteIds";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api";
import { canManagePrograms } from "@/lib/auth";
import type { Program } from "@/lib/programs";
import { deleteProgram, toggleFavorite } from "@/lib/programStore";
import { showToast } from "@/lib/toast";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Management card for the Programas screen: title, favorite, key specs and actions. */
export function ProgramListCard({ program }: { program: Program }) {
  const router = useRouter();
  const [chartOpen, setChartOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const canManage = canManagePrograms(useSession()?.role ?? "Regular");
  const isFavorite = useFavoriteIds().includes(program.id);
  const peak = Math.max(...program.profile.map((p) => p.temp));
  const total = program.profile.at(-1)?.t ?? 0;

  return (
    <article className='card flex h-full flex-col gap-3 rounded-xl p-4'>
      <header className='flex items-start justify-between gap-2 border-b border-[var(--border)] pb-2'>
        <h3 className='truncate text-lg font-semibold'>{program.name}</h3>
        <button
          type='button'
          onClick={() => toggleFavorite(program.id).catch((err) => showToast(err instanceof ApiError ? err.message : "Falha ao atualizar o favorito"))}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className={clsx("btn-press shrink-0 cursor-pointer text-[var(--brand)]", !isFavorite && "opacity-50 hover:opacity-100")}
        >
          <IconGeneral icon='star' fill={isFavorite ? 1 : 0} className='[--icon-size:1.75rem]' />
        </button>
      </header>

      <dl className='flex flex-wrap gap-x-6 gap-y-1 text-sm'>
        <div className='flex gap-1'>
          <dt className='opacity-70'>Temp. Máx:</dt>
          <dd>{peak} °C</dd>
        </div>
        <div className='flex gap-1'>
          <dt className='opacity-70'>Tempo Total:</dt>
          <dd>{formatDuration(total)}</dd>
        </div>
      </dl>
      <p className='text-sm opacity-70'>{`Último Uso: ${program.lastUsed}`}</p>

      <div className='mt-auto flex items-center gap-1 text-[var(--brand)]'>
        <CardAction icon='monitoring' label='Ver Gráfico' onClick={() => setChartOpen(true)} />
        {canManage && (
          <>
            <span className='h-5 w-px shrink-0 bg-current opacity-30' aria-hidden='true' />
            <CardAction icon='edit' label='Editar' onClick={() => router.push(`/programas/${encodeURIComponent(program.id)}/editar`)} />
            <span className='h-5 w-px shrink-0 bg-current opacity-30' aria-hidden='true' />
            <CardAction icon='delete' label='Deletar' onClick={() => setConfirmDeleteOpen(true)} />
          </>
        )}
      </div>

      <Modal open={chartOpen} title={program.name} onClose={() => setChartOpen(false)}>
        <div className='flex h-full flex-col gap-3'>
          <div className='min-h-0 flex-1'>
            <TemperatureProfileChart points={program.profile} className='h-full w-full' />
          </div>
          <dl className='flex flex-wrap justify-center gap-x-8 gap-y-1'>
            <div className='flex gap-1'>
              <dt className='opacity-70'>Temp. Máx:</dt>
              <dd className='font-semibold'>{peak} °C</dd>
            </div>
            <div className='flex gap-1'>
              <dt className='opacity-70'>Tempo Total:</dt>
              <dd className='font-semibold'>{formatDuration(total)}</dd>
            </div>
          </dl>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        tone='danger'
        title='Deletar programa?'
        description={`"${program.name}" será removido permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel='Deletar'
        cancelLabel='Cancelar'
        onConfirm={async () => {
          try {
            await deleteProgram(program.id);
            showToast("Programa deletado");
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : "Falha ao deletar o programa");
          }
          setConfirmDeleteOpen(false);
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </article>
  );
}

function CardAction({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='btn-press flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm hover:bg-[var(--hover)]'
    >
      <IconGeneral icon={icon} fill={0} className='[--icon-size:1.25rem]' />
      <span className='whitespace-nowrap'>{label}</span>
    </button>
  );
}
