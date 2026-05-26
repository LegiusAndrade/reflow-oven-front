"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";

export interface ISelectOption<T extends string> {
  value: T;
  label: string;
  /** Optional Material Symbols icon shown next to the option. */
  icon?: string;
}

export interface ISelectMenuProps<T extends string> {
  /** Leading icon on the trigger button. */
  icon: string;
  options: ISelectOption<T>[];
  value: T;
  onChange: (_value: T) => void;
  /** Extra classes for the wrapper (e.g. a `min-w-*`). */
  className?: string;
}

/**
 * Compact dropdown select: a trigger showing the current option and a popover listbox.
 * Closes on Esc or an outside click; the chevron flips while open. Generic over the value
 * type so it can drive filters, sort modes, etc.
 */
export function SelectMenu<T extends string>({ icon, options, value, onChange, className }: ISelectMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className={clsx("relative", className)}>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-haspopup='listbox'
        aria-expanded={open}
        className='btn-press flex w-full items-center justify-between gap-2 rounded-xl border border-white/15 px-4 py-2.5'
      >
        <span className='flex min-w-0 items-center gap-2'>
          <IconGeneral icon={icon} fill={0} className='shrink-0 opacity-70 [--icon-size:1.25rem]' />
          <span className='truncate opacity-80'>{selected?.label}</span>
        </span>
        <IconGeneral icon='expand_more' fill={0} className={clsx("shrink-0 [--icon-size:1.25rem] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul role='listbox' className='card absolute right-0 z-30 mt-2 max-h-72 w-full min-w-max overflow-auto rounded-xl border border-white/10 py-1'>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type='button'
                  role='option'
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={clsx("flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left hover:bg-white/10", isSelected && "text-[var(--brand)]")}
                >
                  {option.icon && <IconGeneral icon={option.icon} fill={isSelected ? 1 : 0} className='shrink-0 [--icon-size:1.25rem]' />}
                  <span className='flex-1 whitespace-nowrap'>{option.label}</span>
                  {isSelected && <IconGeneral icon='check' fill={0} className='shrink-0 [--icon-size:1.125rem]' />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
