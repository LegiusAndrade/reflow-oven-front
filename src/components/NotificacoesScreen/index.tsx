"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useStore } from "@/hooks/useStore";
import { type AppNotification, clearAll, formatNotificationStamp, markAllRead, notificationsStore, refreshNotifications } from "@/lib/notifications";

const KIND_META: Record<AppNotification["kind"], { icon: string; cls: string }> = {
  update: { icon: "system_update", cls: "text-[var(--brand)]" },
  error: { icon: "error", cls: "text-red-700 dark:text-red-400" },
  warning: { icon: "warning", cls: "text-amber-700 dark:text-amber-400" },
  info: { icon: "info", cls: "text-[var(--brand)]" },
};

/** Notificações screen: the full feed. Marks everything as read when the user OPENS it (clears the
 *  TopBar bell badge on view); the items that were unread on entry stay emphasized for this visit and
 *  fade to "read" (lighter) on the next one. "Limpar tudo" deletes the whole feed on the backend. */
export function NotificacoesScreen() {
  const list = useStore(notificationsStore);

  // Snapshot which items were unread when the screen opened, so they stay visually "new" for THIS
  // visit even after we mark everything read below. Captured (once) at the first render where the
  // feed is non-empty — a setState-in-render sentinel, the same idiom as ChangeDetail's `shownId`.
  const [entryUnread, setEntryUnread] = useState<Set<string> | null>(null);
  if (entryUnread === null && list.length > 0) {
    setEntryUnread(new Set(list.filter((n) => !n.read).map((n) => n.id)));
  }

  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    void refreshNotifications();
  }, []);

  // Once the unread-on-entry set is snapshotted, mark them read to clear the bell badge on view. The
  // snapshot keeps these items emphasized for this visit; they render "read" (lighter) on the next.
  useEffect(() => {
    if (entryUnread && entryUnread.size > 0) void markAllRead();
  }, [entryUnread]);

  return (
    <div className='flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-3 [scrollbar-gutter:stable]'>
      <div className='flex items-center justify-between gap-3'>
        <h1 className='text-xl font-semibold'>Notificações</h1>
        <button
          type='button'
          onClick={() => setConfirmClear(true)}
          disabled={list.length === 0}
          className='btn-press flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-500/10 disabled:pointer-events-none disabled:opacity-40 dark:text-red-400'
        >
          <IconGeneral icon='delete_sweep' fill={0} className='[--icon-size:1.25rem]' />
          Limpar tudo
        </button>
      </div>

      {list.length === 0 ? (
        <p className='opacity-60'>Nenhuma notificação.</p>
      ) : (
        <ul className='flex flex-col gap-2'>
          {list.map((n) => {
            const meta = KIND_META[n.kind];
            // "New this visit": unread on entry, or arrived unread while the screen is open.
            const unread = (entryUnread?.has(n.id) ?? false) || !n.read;
            return (
              <li
                key={n.id}
                className={clsx("card flex items-start gap-3 rounded-xl border border-[var(--border)] p-3 transition-opacity", !unread && "opacity-55")}
              >
                <IconGeneral icon={meta.icon} fill={1} className={`shrink-0 [--icon-size:1.5rem] ${meta.cls}`} />
                <div className='min-w-0 flex-1'>
                  <div className='flex items-start justify-between gap-2'>
                    <p className='font-semibold'>{n.title}</p>
                    <span className='shrink-0 text-xs opacity-50 tabular-nums'>{formatNotificationStamp(n.at)}</span>
                  </div>
                  <p className='text-sm opacity-70'>{n.message}</p>
                </div>
                {unread && <span className='mt-1.5 size-2 shrink-0 rounded-full bg-[var(--brand)]' aria-label='Não lida' />}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmClear}
        tone='danger'
        icon='delete_sweep'
        title='Limpar todas as notificações?'
        description='Todas as notificações serão removidas permanentemente.'
        confirmLabel='Limpar'
        cancelLabel='Cancelar'
        onConfirm={() => {
          setConfirmClear(false);
          void clearAll();
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
