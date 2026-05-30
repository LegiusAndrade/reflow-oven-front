"use client";

import { clsx } from "clsx";
import { useEffect, useRef } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import type { LogEvent, LogEventKind } from "@/lib/reports";

/**
 * Full-area detail view shown over the Relatórios content (Execução / Erro). Carries its own
 * title bar with a close button and a scrollable body, matching the screen's header style.
 * Closes on Esc and moves focus to the close button when it opens.
 */
export function DetailShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  // Move focus in once, on open.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);

  // Close on Esc (rebinds if onClose identity changes; no focus side effect).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div ref={ref} className='flex h-full min-h-0 flex-col gap-5'>
      <header className='flex items-center justify-between gap-4 border-b border-white/10 pb-3'>
        <h1 className='truncate text-2xl font-semibold'>{title}</h1>
        <button
          type='button'
          onClick={onClose}
          aria-label='Voltar'
          className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'
        >
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </button>
      </header>
      <div className='min-h-0 flex-1 overflow-y-auto pr-3 [scrollbar-gutter:stable]'>{children}</div>
    </div>
  );
}

/** Small uppercase heading used for each block of a detail view. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className='mb-2 text-sm font-semibold tracking-wide text-[var(--brand)] uppercase'>{children}</h2>;
}

/** Inline "Label: value" pair for the detail grids. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-wrap items-center gap-x-2'>
      <dt className='opacity-60'>{label}:</dt>
      <dd className='font-medium'>{children}</dd>
    </div>
  );
}

const EVENT_STYLE: Record<LogEventKind, { icon: string; cls: string }> = {
  info: { icon: "info", cls: "text-[var(--brand)]" },
  alerta: { icon: "warning", cls: "text-amber-400" },
  falha: { icon: "error", cls: "text-red-400" },
};

/** Timeline of run/fault events; shows the empty state when there are none. */
export function EventList({ events }: { events: LogEvent[] }) {
  if (events.length === 0) return <p className='opacity-60'>Nenhum alerta registrado.</p>;
  return (
    <ul className='flex flex-col gap-2'>
      {events.map((e, i) => {
        const style = EVENT_STYLE[e.kind];
        return (
          <li key={i} className='flex items-start gap-2'>
            <IconGeneral icon={style.icon} fill={1} className={clsx("mt-0.5 shrink-0 [--icon-size:1.25rem]", style.cls)} />
            <span className='shrink-0 tabular-nums opacity-70'>{e.at}</span>
            <span className={clsx(e.kind === "falha" && "text-red-400")}>{e.message}</span>
          </li>
        );
      })}
    </ul>
  );
}
