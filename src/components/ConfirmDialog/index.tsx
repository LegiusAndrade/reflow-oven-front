"use client";

import { clsx } from "clsx";
import { useEffect, useRef } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";

export interface IConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" paints the confirm button red and uses a warning icon. */
  tone?: "default" | "danger";
  /** Material Symbols icon name; defaults by tone. */
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered modal confirmation. Stays mounted and fades/scales via CSS so it animates both
 * in and out; while closed it's `inert` + `aria-hidden` so it can't be focused or clicked.
 * Esc and a backdrop click both cancel; focus moves in on open and is restored on close.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  icon,
  onConfirm,
  onCancel,
}: IConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onCancel]);

  const danger = tone === "danger";

  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={clsx("fixed inset-0 z-[100] grid place-items-center p-4 transition-opacity duration-200", open ? "opacity-100" : "pointer-events-none opacity-0")}
    >
      {/* Backdrop */}
      <button type='button' aria-label='Fechar' tabIndex={-1} onClick={onCancel} className='absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm' />

      {/* Panel */}
      <div
        ref={panelRef}
        role='alertdialog'
        aria-modal='true'
        aria-label={title}
        className={clsx("card relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] p-6 transition-all duration-200", open ? "scale-100 opacity-100" : "scale-95 opacity-0")}
      >
        <div className='flex items-start gap-4'>
          <span className={clsx("grid size-12 shrink-0 place-items-center rounded-full", danger ? "bg-red-500/15 text-red-700 dark:text-red-400" : "bg-[var(--surface-2)] text-[var(--brand)]")}>
            <IconGeneral icon={icon ?? (danger ? "warning" : "help")} fill={0} className='[--icon-size:1.75rem]' />
          </span>
          <div className='flex flex-col gap-1'>
            <h2 className='text-xl font-semibold'>{title}</h2>
            {description && <p className='opacity-70'>{description}</p>}
          </div>
        </div>

        <div className='mt-6 flex items-center justify-end gap-3'>
          <button type='button' onClick={onCancel} className='btn-press cursor-pointer rounded-xl border border-[var(--border)] px-5 py-2.5 font-semibold'>
            {cancelLabel}
          </button>
          <button
            type='button'
            onClick={onConfirm}
            className={clsx(
              "btn-press flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold",
              danger ? "bg-red-500 text-white hover:bg-red-600" : "btn-action"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
