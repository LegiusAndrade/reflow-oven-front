"use client";

import { useEffect } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useStore } from "@/hooks/useStore";
import { type AppNotification, formatNotificationStamp, markAllRead, notificationsStore, refreshNotifications } from "@/lib/notifications";

const KIND_META: Record<AppNotification["kind"], { icon: string; cls: string }> = {
  update: { icon: "system_update", cls: "text-[var(--brand)]" },
  error: { icon: "error", cls: "text-red-700 dark:text-red-400" },
  info: { icon: "info", cls: "text-[var(--brand)]" },
};

/** Notificações screen: the full feed. Marks everything as read when the user leaves (clears the
 *  TopBar bell badge), so the unread dots stay visible while reading. */
export function NotificacoesScreen() {
  const list = useStore(notificationsStore);

  useEffect(() => {
    void refreshNotifications();
    // Mark everything read when leaving the screen.
    return () => {
      void markAllRead();
    };
  }, []);

  return (
    <div className='flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-3 [scrollbar-gutter:stable]'>
      <h1 className='text-xl font-semibold'>Notificações</h1>

      {list.length === 0 ? (
        <p className='opacity-60'>Nenhuma notificação.</p>
      ) : (
        <ul className='flex flex-col gap-2'>
          {list.map((n) => {
            const meta = KIND_META[n.kind];
            return (
              <li key={n.id} className='card flex items-start gap-3 rounded-xl border border-[var(--border)] p-3'>
                <IconGeneral icon={meta.icon} fill={1} className={`shrink-0 [--icon-size:1.5rem] ${meta.cls}`} />
                <div className='min-w-0 flex-1'>
                  <div className='flex items-start justify-between gap-2'>
                    <p className='font-semibold'>{n.title}</p>
                    <span className='shrink-0 text-xs opacity-50 tabular-nums'>{formatNotificationStamp(n.at)}</span>
                  </div>
                  <p className='text-sm opacity-70'>{n.message}</p>
                </div>
                {!n.read && <span className='mt-1.5 size-2 shrink-0 rounded-full bg-[var(--brand)]' aria-label='Não lida' />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
