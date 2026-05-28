"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import type { NotificationKind } from "@/lib/settings";

const KINDS: { value: NotificationKind; icon: string; cls: string }[] = [
  { value: "Normal", icon: "check_circle", cls: "text-emerald-400" },
  { value: "Atenção", icon: "info", cls: "text-[var(--brand)]" },
  { value: "Crítica", icon: "warning", cls: "text-amber-400" },
  { value: "Grave", icon: "cancel", cls: "text-red-400" },
];

// Approx. popover size, used to keep it inside the viewport.
const POPOVER_W = 184;
const POPOVER_H = 196;

/**
 * Colored severity picker for the Notificações table. The popover is rendered in a portal with
 * `position: fixed` so it's never clipped by the table's `overflow` (same trick as DatePicker).
 */
export function KindSelect({ value, onChange }: { value: NotificationKind; onChange: (_k: NotificationKind) => void }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const current = KINDS.find((k) => k.value === value) ?? KINDS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      const top = Math.max(8, Math.min(r.bottom + 6, window.innerHeight - 8 - POPOVER_H));
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 8 - POPOVER_W));
      setCoords({ top, left });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type='button'
        onClick={toggle}
        aria-haspopup='listbox'
        aria-expanded={open}
        className='btn-press flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5'
      >
        <span className={clsx("inline-flex items-center gap-1.5 font-medium", current.cls)}>
          <IconGeneral icon={current.icon} fill={1} className='[--icon-size:1.25rem]' />
          {current.value}
        </span>
        <IconGeneral icon='expand_more' fill={0} className={clsx("opacity-70 [--icon-size:1.125rem] transition-transform", open && "rotate-180")} />
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            role='listbox'
            style={{ position: "fixed", top: coords.top, left: coords.left, width: POPOVER_W }}
            className='card z-[80] rounded-xl border border-white/10 py-1 shadow-xl'
          >
            {KINDS.map((k) => (
              <button
                key={k.value}
                type='button'
                role='option'
                aria-selected={k.value === value}
                onClick={() => {
                  onChange(k.value);
                  setOpen(false);
                }}
                className='flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left hover:bg-white/10'
              >
                <IconGeneral icon={k.icon} fill={1} className={clsx("[--icon-size:1.25rem]", k.cls)} />
                <span className='text-fg flex-1'>{k.value}</span>
                {k.value === value && <IconGeneral icon='check' fill={0} className='text-fg [--icon-size:1.125rem]' />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
