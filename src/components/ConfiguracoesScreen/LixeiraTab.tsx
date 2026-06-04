"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { TableScrollBox } from "@/components/TableScrollBox";
import { api, ApiError, type Deleted, type NotificationDto, type ProgramDto, type UserDto } from "@/lib/api";
import { refreshNotifications } from "@/lib/notifications";
import { reloadPrograms } from "@/lib/programStore";
import { showToast } from "@/lib/toast";
import { reloadUsers } from "@/lib/users";
import { Segmented } from "./fields";

/**
 * Configurações → Lixeira (Master-only, #8): the soft-delete trash. Programs, users and notifications
 * removed elsewhere land here; the Master can **restaurar** (undelete) or **excluir definitivamente**
 * (purge). The endpoints are MasterOnly, and the tab itself only renders for the Master session.
 */
type TrashKind = "programas" | "usuarios" | "notificacoes";

const pad = (n: number) => String(n).padStart(2, "0");
const fmtStamp = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function LixeiraTab() {
  const [kind, setKind] = useState<TrashKind>("programas");
  const [programs, setPrograms] = useState<Deleted<ProgramDto>[] | null>(null);
  const [users, setUsers] = useState<Deleted<UserDto>[] | null>(null);
  const [notifications, setNotifications] = useState<Deleted<NotificationDto>[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Pending purge (the destructive action gets a confirm dialog); restore is immediate.
  const [purging, setPurging] = useState<{ kind: TrashKind; id: string; label: string } | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listDeletedPrograms()
      .then((d) => alive && setPrograms(d))
      .catch(() => alive && setPrograms([]));
    api
      .listDeletedUsers()
      .then((d) => alive && setUsers(d))
      .catch(() => alive && setUsers([]));
    api
      .listDeletedNotifications()
      .then((d) => alive && setNotifications(d))
      .catch(() => alive && setNotifications([]));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);
  const counts = { programas: programs?.length ?? 0, usuarios: users?.length ?? 0, notificacoes: notifications?.length ?? 0 };

  const restore = async (k: TrashKind, id: string, label: string) => {
    try {
      // Restore on the server, then reload the main store the matching screen reads from, so the item
      // reappears there (Usuários / galeria / sino) instead of just vanishing from the trash.
      if (k === "programas") {
        await api.restoreProgram(id);
        await reloadPrograms();
      } else if (k === "usuarios") {
        await api.restoreUser(id);
        await reloadUsers();
      } else {
        await api.restoreNotification(id);
        await refreshNotifications(true);
      }
      showToast(`"${label}" restaurado`);
      refresh();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao restaurar", "error");
    }
  };

  const doPurge = async () => {
    if (!purging) return;
    const { kind: k, id, label } = purging;
    try {
      if (k === "programas") await api.purgeProgram(id);
      else if (k === "usuarios") await api.purgeUser(id);
      else await api.purgeNotification(id);
      showToast(`"${label}" excluído definitivamente`);
      refresh();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao excluir definitivamente", "error");
    }
    setPurging(null);
  };

  const SOURCE: { value: TrashKind; label: string; icon: string }[] = [
    { value: "programas", label: `Programas (${counts.programas})`, icon: "article" },
    { value: "usuarios", label: `Usuários (${counts.usuarios})`, icon: "group" },
    { value: "notificacoes", label: `Notificações (${counts.notificacoes})`, icon: "notifications" },
  ];

  return (
    <div className='flex h-full min-h-0 flex-col gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Segmented options={SOURCE} value={kind} onChange={setKind} label='Tipo da lixeira' />
        <span className='text-xs opacity-60'>Itens excluídos — restaure ou exclua definitivamente.</span>
      </div>

      {kind === "programas" && (
        <TrashList
          items={programs}
          emptyLabel='Nenhum programa na lixeira.'
          primary={(p) => p.name}
          secondary={() => "Perfil de temperatura"}
          onRestore={(p) => restore("programas", p.id, p.name)}
          onPurge={(p) => setPurging({ kind: "programas", id: p.id, label: p.name })}
        />
      )}
      {kind === "usuarios" && (
        <TrashList
          items={users}
          emptyLabel='Nenhum usuário na lixeira.'
          primary={(u) => u.name}
          secondary={(u) => `${u.email} · ${u.type}`}
          onRestore={(u) => restore("usuarios", u.id, u.name)}
          onPurge={(u) => setPurging({ kind: "usuarios", id: u.id, label: u.name })}
        />
      )}
      {kind === "notificacoes" && (
        <TrashList
          items={notifications}
          emptyLabel='Nenhuma notificação na lixeira.'
          primary={(n) => n.title}
          secondary={(n) => n.message}
          onRestore={(n) => restore("notificacoes", n.id, n.title)}
          onPurge={(n) => setPurging({ kind: "notificacoes", id: n.id, label: n.title })}
        />
      )}

      <ConfirmDialog
        open={purging !== null}
        tone='danger'
        icon='delete_forever'
        title='Excluir definitivamente?'
        description={purging ? `"${purging.label}" será removido de vez. Esta ação não pode ser desfeita.` : ""}
        confirmLabel='Excluir'
        cancelLabel='Voltar'
        onConfirm={doPurge}
        onCancel={() => setPurging(null)}
      />
    </div>
  );
}

/** A list of soft-deleted items of one kind, with per-row Restaurar / Excluir actions. */
function TrashList<T extends { id: string; deletedAt: string; deletedBy?: string | null }>({
  items,
  emptyLabel,
  primary,
  secondary,
  onRestore,
  onPurge,
}: {
  items: T[] | null;
  emptyLabel: string;
  primary: (_item: T) => string;
  secondary: (_item: T) => string;
  onRestore: (_item: T) => void;
  onPurge: (_item: T) => void;
}) {
  if (items === null) {
    return (
      <div className='flex min-h-0 flex-1 items-center justify-center gap-2 opacity-60'>
        <IconGeneral icon='progress_activity' fill={0} className='animate-spin [--icon-size:1.5rem]' />
        <span className='text-sm'>Carregando…</span>
      </div>
    );
  }
  if (items.length === 0) {
    return <div className='flex min-h-0 flex-1 items-center justify-center text-sm opacity-60'>{emptyLabel}</div>;
  }
  return (
    <TableScrollBox className='min-h-0 flex-1'>
      <ul className='divide-y divide-(--border)'>
        {items.map((it) => (
          <li key={it.id} className='flex items-center gap-3 px-3 py-2.5'>
            <IconGeneral icon='delete' fill={0} className='shrink-0 opacity-40 [--icon-size:1.25rem]' />
            <div className='min-w-0 flex-1'>
              <p className='truncate font-medium'>{primary(it)}</p>
              <p className='truncate text-sm opacity-60'>{secondary(it)}</p>
              <p className='text-xs opacity-50'>
                Excluído em {fmtStamp(it.deletedAt)}
                {it.deletedBy ? ` por ${it.deletedBy}` : ""}
              </p>
            </div>
            <button
              type='button'
              onClick={() => onRestore(it)}
              className='btn-press flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-(--border) px-3 py-1.5 text-sm font-semibold hover:bg-(--hover)'
            >
              <IconGeneral icon='restore' fill={0} className='[--icon-size:1.125rem]' />
              Restaurar
            </button>
            <button
              type='button'
              onClick={() => onPurge(it)}
              className='btn-press flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-400'
            >
              <IconGeneral icon='delete_forever' fill={0} className='[--icon-size:1.125rem]' />
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </TableScrollBox>
  );
}
