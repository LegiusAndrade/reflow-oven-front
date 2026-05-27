"use client";

import { clsx } from "clsx";
import { useEffect, useRef } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";

export interface IModalProps {
  open: boolean;
  /** Optional header title; when set, a header with a close button is rendered. */
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Tailwind sizing for the panel; defaults to a large, slightly-inset dialog. */
  panelClassName?: string;
}

/**
 * Generic centered modal: dimmed/blurred backdrop + a `.card` panel that fades and scales
 * in/out via CSS. While closed it's `inert` + `aria-hidden`, so it can't be focused or
 * clicked. Esc and a backdrop click both close; focus moves in on open and is restored on
 * close. Pass content as `children`; size the panel with `panelClassName`.
 */
export function Modal({ open, title, onClose, children, panelClassName }: IModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={clsx("fixed inset-0 z-[100] grid place-items-center p-4 transition-opacity duration-200", open ? "opacity-100" : "pointer-events-none opacity-0")}
    >
      {/* Backdrop */}
      <button type='button' aria-label='Fechar' tabIndex={-1} onClick={onClose} className='absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm' />

      {/* Panel */}
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-label={title}
        className={clsx(
          "card relative z-10 flex flex-col rounded-2xl border border-white/10 transition-all duration-200",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0",
          panelClassName ?? "h-[85vh] w-[90vw] max-w-5xl"
        )}
      >
        {title !== undefined && (
          <header className='flex items-center justify-between gap-4 border-b border-white/10 p-4'>
            <h2 className='truncate text-xl font-semibold'>{title}</h2>
            <button type='button' onClick={onClose} aria-label='Fechar' className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'>
              <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
            </button>
          </header>
        )}
        <div className='min-h-0 flex-1 overflow-y-auto p-4'>{children}</div>
      </div>
    </div>
  );
}
