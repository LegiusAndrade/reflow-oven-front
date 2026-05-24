"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { ProgramListCard } from "@/components/ProgramListCard";
import type { Program } from "@/lib/programs";

const CARD_MIN_W = 320;
const CARD_MIN_H = 190;
const GAP = 16;

/** Programas screen: search/filter over a paginated grid of program management cards. */
export function ProgramasScreen({ programs }: { programs: Program[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? programs.filter((p) => p.name.toLowerCase().includes(q)) : programs;
  }, [programs, query]);

  const cols = Math.max(1, Math.floor((w + GAP) / (CARD_MIN_W + GAP)));
  const rows = Math.max(1, Math.floor((h + GAP) / (CARD_MIN_H + GAP)));
  const perPage = cols * rows;
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const activePage = Math.min(page, pages - 1);
  const shown = filtered.slice(activePage * perPage, activePage * perPage + perPage);

  return (
    <section className='card flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-white/10 pb-3'>
        <h1 className='text-2xl font-semibold'>Programas</h1>
        <Link
          href='/'
          aria-label='Fechar'
          className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'
        >
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      {/* Search + filter */}
      <div className='flex flex-wrap items-center gap-3'>
        <label className='flex flex-1 items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5'>
          <IconGeneral icon='search' fill={0} className='shrink-0 opacity-70 [--icon-size:1.25rem]' />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder='Pesquisar programa...'
            className='w-full bg-transparent outline-none placeholder:opacity-60'
          />
        </label>
        <button type='button' className='btn-press flex min-w-[15rem] items-center justify-between gap-2 rounded-xl border border-white/15 px-4 py-2.5'>
          <span className='opacity-80'>Filtrar por...</span>
          <IconGeneral icon='expand_more' fill={0} className='[--icon-size:1.25rem]' />
        </button>
      </div>

      {/* Cards (paginated to fit the area) */}
      <div
        ref={gridRef}
        className='grid min-h-0 flex-1'
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "1fr", gap: `${GAP}px` }}
      >
        {shown.map((program) => (
          <ProgramListCard key={program.id} program={program} />
        ))}
        {filtered.length === 0 && <p className='opacity-60'>Nenhum programa encontrado.</p>}
      </div>

      {/* Footer: pagination centered, new program on the right */}
      <footer className='grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
        <span className='text-sm opacity-70'>{`${filtered.length} programa${filtered.length === 1 ? "" : "s"}`}</span>
        <Pagination pages={pages} active={activePage} onChange={setPage} />
        <button type='button' className='btn-action flex cursor-pointer items-center gap-2 justify-self-end rounded-xl px-4 py-2.5 font-semibold'>
          <IconGeneral icon='add' fill={0} className='[--icon-size:1.25rem]' />
          Novo Programa
        </button>
      </footer>
    </section>
  );
}

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

function Pagination({ pages, active, onChange }: { pages: number; active: number; onChange: (_page: number) => void }) {
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
