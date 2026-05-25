"use client";

import { clsx } from "clsx";
import { useSyncExternalStore } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { dismissToast, getToastsServerSnapshot, getToastsSnapshot, subscribeToasts, type Toast } from "@/lib/toast";

const STYLES: Record<Toast["type"], { icon: string; accent: string }> = {
  success: { icon: "check_circle", accent: "text-emerald-400" },
  error: { icon: "error", accent: "text-red-400" },
  info: { icon: "info", accent: "text-[var(--brand)]" },
};

/** Renders active toasts at the bottom of the content area. Mounted once in AppShell. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToastsSnapshot, getToastsServerSnapshot);

  if (toasts.length === 0) return null;

  return (
    <div className='pointer-events-none absolute inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4' aria-live='polite'>
      {toasts.map((toast) => {
        const style = STYLES[toast.type];
        return (
          <div key={toast.id} role='status' className='toast-item card pointer-events-auto flex items-center gap-3 rounded-xl border border-white/10 py-3 pl-4 pr-3'>
            <IconGeneral icon={style.icon} fill={1} className={clsx("shrink-0 [--icon-size:1.5rem]", style.accent)} />
            <span className='font-medium'>{toast.message}</span>
            <button
              type='button'
              onClick={() => dismissToast(toast.id)}
              aria-label='Fechar'
              className='btn-press grid size-7 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'
            >
              <IconGeneral icon='close' fill={0} className='[--icon-size:1.125rem]' />
            </button>
          </div>
        );
      })}
    </div>
  );
}
