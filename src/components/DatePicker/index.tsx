"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { IconGeneral } from "@/components/Icon/IconGeneral";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO "yyyy-mm-dd" -> "dd/mm/aaaa" (empty -> ""). */
function isoToBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function isoToDate(iso: string): Date | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : undefined;
}

function dateToIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Theme the calendar with the app's brand accent (selected day shows a border, no fill).
const CALENDAR_STYLE = {
  "--rdp-accent-color": "var(--brand)",
  "--rdp-accent-background-color": "color-mix(in srgb, var(--brand) 22%, transparent)",
  "--rdp-day-width": "2.5rem",
  "--rdp-day-height": "2.5rem",
  "--rdp-day_button-width": "2.5rem",
  "--rdp-day_button-height": "2.5rem",
} as React.CSSProperties;

/** Earliest month the calendar lets you navigate/select to (floor for the year dropdown). */
const FLOOR_MONTH = new Date(2000, 0, 1);

// Approximate popover size, used to keep it inside the viewport when positioning.
const POPOVER_W = 300;
const POPOVER_H = 360;

export interface IDatePickerProps {
  /** ISO value "yyyy-mm-dd" (or ""). */
  value: string;
  onChange: (_iso: string) => void;
  label: string;
  /** Earliest selectable date (ISO); days before it are disabled. */
  min?: string;
  /** Latest selectable date (ISO); days after it are disabled. */
  max?: string;
  className?: string;
}

/**
 * Date picker built on react-day-picker (pt-BR locale). The trigger always shows dd/mm/aaaa
 * (independent of the browser locale); the popover calendar picks a full date — no partial
 * "year only" state. Emits an ISO "yyyy-mm-dd" value (or "" when cleared). Closes on Esc /
 * outside click.
 */
export function DatePicker({ value, onChange, label, min, max, className }: IDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = isoToDate(value);
  const minDate = min ? isoToDate(min) : undefined;
  const maxDate = max ? isoToDate(max) : undefined;
  const disabled = [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Position the popover (fixed, in a portal) just below the trigger, clamped into the viewport
  // so it isn't cut off by the page's overflow-hidden on the small 1024×600 screen.
  const toggle = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 8 - POPOVER_H));
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 8 - POPOVER_W));
      setCoords({ top, left });
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={triggerRef} className={clsx("relative", className)}>
      <button
        type='button'
        onClick={toggle}
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-label={label}
        className='btn-press flex w-full items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5'
      >
        <IconGeneral icon='calendar_today' fill={0} className='shrink-0 opacity-70 [--icon-size:1.125rem]' />
        <span className={clsx("tabular-nums", !value && "opacity-60")}>{value ? isoToBr(value) : "dd/mm/aaaa"}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role='dialog'
            aria-label={label}
            style={{ position: "fixed", top: coords.top, left: coords.left }}
            className='card text-fg z-[80] rounded-xl border border-[var(--border)] p-2 shadow-xl'
          >
            <DayPicker
              mode='single'
              locale={ptBR}
              captionLayout='dropdown'
              startMonth={minDate ?? FLOOR_MONTH}
              endMonth={maxDate}
              disabled={disabled}
              selected={selected}
              defaultMonth={selected ?? minDate ?? maxDate}
              onSelect={(date) => {
                onChange(date ? dateToIso(date) : "");
                setOpen(false);
              }}
              style={CALENDAR_STYLE}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
