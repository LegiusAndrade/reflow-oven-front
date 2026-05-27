"use client";

import { clsx } from "clsx";
import { IconGeneral } from "@/components/Icon/IconGeneral";

/** First/last + current±1 with ellipses (e.g. 1 2 … 9 10). Indices are 0-based. */
function getPageItems(active: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const items: (number | "ellipsis")[] = [0];
  const start = Math.max(1, active - 1);
  const end = Math.min(total - 2, active + 1);
  if (start > 1) items.push("ellipsis");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 2) items.push("ellipsis");
  items.push(total - 1);
  return items;
}

/**
 * Page selector shared by the program gallery and the report tables: prev/next arrows plus
 * numbered pages with ellipses. Indices are 0-based. Renders an empty <div /> for a single
 * page so a `grid-cols-[1fr_auto_1fr]` footer keeps its center column.
 */
export function Pagination({ pages, active, onChange }: { pages: number; active: number; onChange: (_page: number) => void }) {
  if (pages <= 1) return <div />;
  return (
    <nav aria-label='Paginação' className='flex items-center gap-1'>
      <PagerArrow icon='chevron_left' label='Página anterior' onClick={() => onChange(active - 1)} disabled={active === 0} />
      {getPageItems(active, pages).map((item, i) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className='px-1 opacity-60'>
            …
          </span>
        ) : (
          <button
            key={item}
            type='button'
            onClick={() => onChange(item)}
            aria-current={item === active ? "page" : undefined}
            className={clsx(
              "btn-press grid size-9 cursor-pointer place-items-center rounded-lg tabular-nums",
              item === active ? "btn-link-active" : "hover:bg-white/10"
            )}
          >
            {item + 1}
          </button>
        )
      )}
      <PagerArrow icon='chevron_right' label='Próxima página' onClick={() => onChange(active + 1)} disabled={active === pages - 1} />
    </nav>
  );
}

function PagerArrow({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className='btn-press grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'
    >
      <IconGeneral icon={icon} fill={0} className='[--icon-size:1.25rem]' />
    </button>
  );
}
