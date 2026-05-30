"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { useStore } from "@/hooks/useStore";
import { cleanupStore, type CleanupId, formatBytes, performCleanup, recordCount, recordSizeBytes } from "@/lib/maintenance";
import { showToast } from "@/lib/toast";
import { usersStore } from "@/lib/users";

const CATEGORIES: { id: CleanupId; label: string; hint: string; icon: string }[] = [
  { id: "execucoes", label: "Histórico de execuções", hint: "Relatórios de execuções concluídas e com falha", icon: "history" },
  { id: "alteracoes", label: "Registro de alterações", hint: "Auditoria de programas e configurações (criação/edição/remoção)", icon: "edit_note" },
  { id: "falhas", label: "Registro de falhas", hint: "Eventos de falha registrados pela placa de potência", icon: "error" },
  { id: "logs", label: "Logs do sistema", hint: "Mensagens de INFO / Aviso / Erro do sistema", icon: "receipt_long" },
  { id: "inativos", label: "Usuários inativos", hint: "Remove permanentemente os usuários marcados como inativos", icon: "person_off" },
];

/** Diagnóstico → modal to clear historical records (and inactive users) from the database. */
export function DbCleanupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const users = useStore(usersStore);
  const cleared = useStore(cleanupStore);
  const [selected, setSelected] = useState<Set<CleanupId>>(new Set());
  const [confirming, setConfirming] = useState(false);
  // Reset selection/confirm each time the modal opens (adjust-during-render, no effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected(new Set());
      setConfirming(false);
    }
  }

  const countOf = (id: CleanupId): number => recordCount(id, cleared, users);

  const toggle = (id: CleanupId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectable = CATEGORIES.filter((c) => countOf(c.id) > 0);
  const allSelected = selectable.length > 0 && selectable.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((c) => c.id)));

  const chosen = [...selected].filter((id) => countOf(id) > 0);
  const totalRecords = chosen.reduce((sum, id) => sum + countOf(id), 0);
  const totalBytes = chosen.reduce((sum, id) => sum + recordSizeBytes(id, countOf(id)), 0);

  const runCleanup = () => {
    performCleanup(chosen);
    // TODO(backend): show this on the API success response.
    showToast(`Limpeza concluída — ${totalRecords} ${totalRecords === 1 ? "registro removido" : "registros removidos"} (${formatBytes(totalBytes)})`);
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <Modal open={open} title='Limpeza do banco de dados' onClose={onClose} panelClassName='h-[min(88vh,34rem)] w-[min(92vw,40rem)]'>
        <div className='flex h-full flex-col gap-4'>
          <p className='shrink-0 text-sm opacity-70'>Selecione o que deseja remover. A ação é permanente e não pode ser desfeita.</p>

          <button
            type='button'
            onClick={toggleAll}
            disabled={selectable.length === 0}
            className='btn-press flex w-fit shrink-0 cursor-pointer items-center gap-2 self-end rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'
          >
            <IconGeneral icon={allSelected ? "deselect" : "select_all"} fill={0} className='[--icon-size:1.125rem]' />
            {allSelected ? "Limpar seleção" : "Selecionar tudo"}
          </button>

          <ul className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-3 [scrollbar-gutter:stable]'>
            {CATEGORIES.map((c) => {
              const count = countOf(c.id);
              const size = recordSizeBytes(c.id, count);
              const empty = count === 0;
              const checked = selected.has(c.id);
              return (
                <li key={c.id}>
                  <label
                    className={clsx(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                      empty ? "cursor-not-allowed border-white/10 opacity-50" : "cursor-pointer border-white/15 hover:bg-white/5",
                      checked && "border-[var(--brand)] bg-[var(--brand)]/10"
                    )}
                  >
                    <input
                      type='checkbox'
                      className='size-4 shrink-0 accent-[var(--brand)]'
                      checked={checked}
                      disabled={empty}
                      onChange={() => toggle(c.id)}
                    />
                    <IconGeneral icon={c.icon} fill={0} className='shrink-0 text-[var(--brand)] [--icon-size:1.5rem]' />
                    <div className='min-w-0 flex-1'>
                      <p className='font-medium'>{c.label}</p>
                      <p className='truncate text-sm opacity-60'>{c.hint}</p>
                    </div>
                    <span className='shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-right text-sm font-semibold tabular-nums'>
                      {empty ? "vazio" : `${count} · ${formatBytes(size)}`}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className='flex shrink-0 items-center justify-end gap-3 border-t border-white/10 pt-4'>
            <button type='button' onClick={onClose} className='btn-press cursor-pointer rounded-xl border border-white/15 px-5 py-2.5 font-semibold'>
              Cancelar
            </button>
            <button
              type='button'
              onClick={() => setConfirming(true)}
              disabled={chosen.length === 0}
              className='btn-press flex cursor-pointer items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40'
            >
              <IconGeneral icon='delete_sweep' fill={0} className='[--icon-size:1.25rem]' />
              Limpar{chosen.length ? ` (${formatBytes(totalBytes)})` : ""}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        tone='danger'
        icon='delete_forever'
        title='Confirmar limpeza?'
        description={`${totalRecords} ${totalRecords === 1 ? "registro" : "registros"} (${formatBytes(totalBytes)}) em ${chosen.length} ${chosen.length === 1 ? "categoria" : "categorias"} ${totalRecords === 1 ? "será removido" : "serão removidos"}. Esta ação não pode ser desfeita.`}
        confirmLabel='Limpar'
        cancelLabel='Voltar'
        onConfirm={runCleanup}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
