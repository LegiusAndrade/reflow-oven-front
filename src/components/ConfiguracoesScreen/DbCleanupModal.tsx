"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { useSession } from "@/hooks/useSession";
import { ApiError, type MaintenanceCategoryDto } from "@/lib/api";
import { isMaster } from "@/lib/auth";
import { type CleanupId, formatBytes, performCleanup } from "@/lib/maintenance";
import { showToast } from "@/lib/toast";

// "Registro de alterações" (audit log) is intentionally NOT here — it is protected from cleanup (#8);
// the backend overview omits it too, so it can never be selected. Counts/sizes are the live values
// from GET /api/maintenance/overview (passed in as `categories`); this list only adds icon/label/hint.
const CATEGORIES: { id: CleanupId; label: string; hint: string; icon: string }[] = [
  { id: "execucoes", label: "Histórico de execuções", hint: "Relatórios de execuções concluídas e com falha", icon: "history" },
  { id: "falhas", label: "Registro de falhas", hint: "Eventos de falha registrados pela placa de potência", icon: "error" },
  { id: "logs", label: "Logs do sistema", hint: "Mensagens de INFO / Aviso / Erro do sistema", icon: "receipt_long" },
  { id: "programas", label: "Programas", hint: "Remove todos os perfis de temperatura salvos", icon: "article" },
  { id: "programas_deletados", label: "Programas deletados", hint: "Expurga os programas na lixeira (já excluídos)", icon: "auto_delete" },
  { id: "inativos", label: "Usuários inativos", hint: "Remove permanentemente os usuários marcados como inativos", icon: "person_off" },
  { id: "usuarios", label: "Usuários ativos", hint: "Remove os usuários ativos, exceto o que está em uso agora", icon: "group" },
  { id: "usuarios_deletados", label: "Usuários deletados", hint: "Expurga os usuários na lixeira (já excluídos)", icon: "person_remove" },
];

// Categories the Master may VIEW (size) but not clean — wiping saved programs and user accounts (active
// OR inactive) is the Admin's data-management job, not the technician's. History (execuções/falhas/logs)
// stays cleanable by both. The backend must enforce this too (front gating alone isn't security).
const ADMIN_ONLY_CLEANUP: ReadonlySet<CleanupId> = new Set(["programas", "usuarios", "inativos"]);

// Trash categories — only the Master sees and purges them (the Lixeira is Master-only); the Admin never
// sees deleted programs/users in the cleanup at all. Orthogonal to ADMIN_ONLY_CLEANUP above.
const MASTER_ONLY_CLEANUP: ReadonlySet<CleanupId> = new Set(["programas_deletados", "usuarios_deletados"]);

interface IDbCleanupModalProps {
  open: boolean;
  onClose: () => void;
  /** Live per-category counts/sizes from the overview (null while the parent is still loading it). */
  categories: MaintenanceCategoryDto[] | null;
  /** Frontend-known counts (e.g. programs, active users) shown while the overview doesn't report their
   *  size yet (backend #5). Display-only: a category is cleanable only when the overview backs it. */
  fallbackCounts?: Partial<Record<CleanupId, number>>;
  /** Called after a successful cleanup so the parent re-fetches the overview. */
  onCleaned: () => void;
}

/** Diagnóstico → modal to clear historical records (and inactive users) from the database. */
export function DbCleanupModal({ open, onClose, categories, fallbackCounts, onCleaned }: IDbCleanupModalProps) {
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

  const loading = categories === null;
  const liveById = new Map((categories ?? []).map((c) => [c.id, c]));
  const countOf = (id: CleanupId): number => liveById.get(id)?.count ?? 0;
  const bytesOf = (id: CleanupId): number => liveById.get(id)?.bytes ?? 0;
  // For DISPLAY: the overview's real count, else the frontend-known fallback (so the Master at least
  // sees the QUANTITY while the overview doesn't report programs/active-users sizes — #5). Cleanability
  // still keys off the overview (`countOf`), so a fallback-only row shows its count but can't be cleaned.
  const displayCountOf = (id: CleanupId): number => {
    // "Usuários ativos": show the TOTAL active (including the signed-in user) from the front store so the
    // count matches reality; the cleanup still spares the signed-in one (see the toast) and deletes the rest.
    if (id === "usuarios" && fallbackCounts?.usuarios != null) return fallbackCounts.usuarios;
    return liveById.has(id) ? liveById.get(id)!.count : (fallbackCounts?.[id] ?? 0);
  };
  // The Master (dev superuser) keeps a read-only view of the programs/users size but can't clean them.
  const master = isMaster(useSession()?.role ?? "Regular");
  const restricted = (id: CleanupId): boolean => master && ADMIN_ONLY_CLEANUP.has(id);
  // The Admin never even sees the trash (deleted programs/users) categories — only the Master does.
  const visibleCategories = CATEGORIES.filter((c) => master || !MASTER_ONLY_CLEANUP.has(c.id));

  const toggle = (id: CleanupId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectable = visibleCategories.filter((c) => countOf(c.id) > 0 && !restricted(c.id));
  const allSelected = selectable.length > 0 && selectable.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((c) => c.id)));

  const chosen = [...selected].filter((id) => countOf(id) > 0 && !restricted(id));
  const totalRecords = chosen.reduce((sum, id) => sum + countOf(id), 0);
  const totalBytes = chosen.reduce((sum, id) => sum + bytesOf(id), 0);

  const runCleanup = async () => {
    try {
      const deleted = await performCleanup(chosen);
      const n = deleted || totalRecords;
      // "Usuários ativos" never removes the signed-in user (the count shows the total, but the cleanup
      // spares you) — say so, so a smaller "removed" number than the badge isn't a surprise.
      const spared = chosen.includes("usuarios") ? " Seu usuário foi mantido." : "";
      showToast(`Limpeza concluída — ${n} ${n === 1 ? "registro removido" : "registros removidos"} (${formatBytes(totalBytes)}).${spared}`);
      onCleaned();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha na limpeza do banco", "error");
    }
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        title='Limpeza do banco de dados'
        onClose={onClose}
        // Compact on the 1024×600 device; grows on larger screens (xl+) so it isn't a small box on a monitor.
        panelClassName='h-[min(88vh,34rem)] w-[min(92vw,40rem)] xl:h-[min(90vh,56rem)] xl:w-[min(85vw,60rem)]'
      >
        <div className='flex h-full flex-col gap-4'>
          <p className='shrink-0 text-sm opacity-70'>Selecione o que deseja remover. A ação é permanente e não pode ser desfeita.</p>

          <button
            type='button'
            onClick={toggleAll}
            disabled={selectable.length === 0}
            className='btn-press flex w-fit shrink-0 cursor-pointer items-center gap-2 self-end rounded-lg border border-(--border) px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'
          >
            <IconGeneral icon={allSelected ? "deselect" : "select_all"} fill={0} className='[--icon-size:1.125rem]' />
            {allSelected ? "Limpar seleção" : "Selecionar tudo"}
          </button>

          {loading ? (
            <div className='flex min-h-0 flex-1 items-center justify-center gap-2 opacity-60'>
              <IconGeneral icon='progress_activity' fill={0} className='animate-spin [--icon-size:1.5rem]' />
              <span className='text-sm'>Carregando registros…</span>
            </div>
          ) : (
            <ul className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-3 scrollbar-gutter-stable'>
              {visibleCategories.map((c) => {
                const overviewBacked = liveById.has(c.id);
                const count = displayCountOf(c.id);
                const empty = count === 0;
                const blocked = restricted(c.id); // Master: view-only on programs/users
                // Cleanable only when the overview backs it (the backend supports the id); a fallback-only
                // row shows its count but stays disabled until the overview reports it.
                const disabled = countOf(c.id) === 0 || blocked;
                const checked = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label
                      className={clsx(
                        "flex items-center gap-3 rounded-xl border border-(--border) px-3 py-2.5 transition-colors",
                        disabled ? (empty ? "cursor-not-allowed opacity-50" : "cursor-default") : "cursor-pointer hover:bg-(--hover)",
                        checked && "border-(--brand) bg-(--brand)/10"
                      )}
                    >
                      {blocked ? (
                        <IconGeneral icon='lock' fill={1} className='shrink-0 opacity-60 [--icon-size:1.125rem]' />
                      ) : (
                        <input
                          type='checkbox'
                          className='size-4 shrink-0 accent-(--brand)'
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(c.id)}
                        />
                      )}
                      <IconGeneral icon={c.icon} fill={0} className='shrink-0 text-(--brand) [--icon-size:1.5rem]' />
                      <div className='min-w-0 flex-1'>
                        <p className='font-medium'>{c.label}</p>
                        <p className='truncate text-sm opacity-60'>{c.hint}</p>
                      </div>
                      {blocked && <span className='shrink-0 rounded-md bg-(--surface-2) px-2 py-0.5 text-xs font-medium opacity-70'>Somente Admin</span>}
                      <span
                        className='shrink-0 rounded-md bg-(--surface-2) px-2 py-0.5 text-right text-sm font-semibold tabular-nums'
                        title={!empty && !overviewBacked ? "Tamanho exato pendente do servidor" : undefined}
                      >
                        {empty ? "vazio" : overviewBacked ? `${count} · ${formatBytes(bytesOf(c.id))}` : `${count} ${count === 1 ? "item" : "itens"}`}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className='flex shrink-0 items-center justify-end gap-3 border-t border-(--border) pt-4'>
            <button type='button' onClick={onClose} className='btn-press cursor-pointer rounded-xl border border-(--border) px-5 py-2.5 font-semibold'>
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
