"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { ProgramListCard } from "@/components/ProgramListCard";
import { useAllPrograms } from "@/hooks/useAllPrograms";
import { useFavoriteIds } from "@/hooks/useFavoriteIds";
import type { Program } from "@/lib/programs";

const CARD_MIN_W = 320;
const CARD_MIN_H = 190;
const GAP = 16;

type FilterMode = "all" | "favorites";

/** Programas screen: search/filter over a paginated grid of program management cards. */
export function ProgramasScreen({ programs }: { programs: Program[] }) {
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
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

  const allPrograms = useAllPrograms(programs);
  const favoriteIds = useFavoriteIds();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const favorites = new Set(favoriteIds);
    return allPrograms.filter((p) => {
      if (filterMode === "favorites" && !favorites.has(p.id)) return false;
      return q ? p.name.toLowerCase().includes(q) : true;
    });
  }, [allPrograms, query, filterMode, favoriteIds]);

  const cols = Math.max(1, Math.floor((w + GAP) / (CARD_MIN_W + GAP)));
  const rows = Math.max(1, Math.floor((h + GAP) / (CARD_MIN_H + GAP)));
  // Fixed row height (the height a full page uses) so the last page keeps the same card size
  // as earlier pages instead of stretching a lone row to fill the grid.
  const rowHeight = h > 0 ? (h - (rows - 1) * GAP) / rows : CARD_MIN_H;
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
        <FilterMenu
          value={filterMode}
          favoriteCount={favoriteIds.length}
          onChange={(mode) => {
            setFilterMode(mode);
            setPage(0);
          }}
        />
      </div>

      {/* Cards (paginated to fit the area) */}
      <div
        ref={gridRef}
        className='grid min-h-0 flex-1 content-start'
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: `${rowHeight}px`, gap: `${GAP}px` }}
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
        <Link href='/programas/novo' className='btn-action flex cursor-pointer items-center gap-2 justify-self-end rounded-xl px-4 py-2.5 font-semibold'>
          <IconGeneral icon='add' fill={0} className='[--icon-size:1.25rem]' />
          Novo Programa
        </Link>
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

/** "Filtrar por..." dropdown (currently: all vs. favorites only). */
function FilterMenu({ value, favoriteCount, onChange }: { value: FilterMode; favoriteCount: number; onChange: (_mode: FilterMode) => void }) {
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

  const label = value === "favorites" ? "Apenas favoritos" : "Todos os programas";

  return (
    <div ref={ref} className='relative'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-haspopup='listbox'
        aria-expanded={open}
        className='btn-press flex min-w-[15rem] items-center justify-between gap-2 rounded-xl border border-white/15 px-4 py-2.5'
      >
        <span className='flex items-center gap-2'>
          <IconGeneral icon='filter_list' fill={0} className='opacity-70 [--icon-size:1.25rem]' />
          <span className='opacity-80'>{label}</span>
        </span>
        <IconGeneral icon='expand_more' fill={0} className={clsx("[--icon-size:1.25rem] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul role='listbox' className='card absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 py-1'>
          <FilterOption icon='list' label='Todos os programas' selected={value === "all"} onClick={() => onChange("all")} />
          <FilterOption icon='star' label={favoriteCount ? `Apenas favoritos (${favoriteCount})` : "Apenas favoritos"} selected={value === "favorites"} onClick={() => onChange("favorites")} />
        </ul>
      )}
    </div>
  );
}

function FilterOption({ icon, label, selected, onClick }: { icon: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type='button'
        role='option'
        aria-selected={selected}
        onClick={onClick}
        className={clsx("flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left hover:bg-white/10", selected && "text-[var(--brand)]")}
      >
        <IconGeneral icon={icon} fill={selected ? 1 : 0} className='[--icon-size:1.25rem]' />
        <span className='flex-1'>{label}</span>
        {selected && <IconGeneral icon='check' fill={0} className='[--icon-size:1.125rem]' />}
      </button>
    </li>
  );
}
