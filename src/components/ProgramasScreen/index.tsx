"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Pagination } from "@/components/Pagination";
import { ProgramListCard } from "@/components/ProgramListCard";
import { SelectMenu, type ISelectOption } from "@/components/SelectMenu";
import { useAllPrograms } from "@/hooks/useAllPrograms";
import { useFavoriteIds } from "@/hooks/useFavoriteIds";
import { useSession } from "@/hooks/useSession";
import { canManagePrograms } from "@/lib/auth";
import type { Program } from "@/lib/programs";

const CARD_MIN_W = 320;
const CARD_MIN_H = 190;
const GAP = 16;

type FilterMode = "all" | "favorites" | "unused" | "used";
type SortMode = "default" | "recent" | "most-used" | "name" | "temp" | "duration";

const FILTER_OPTIONS: ISelectOption<FilterMode>[] = [
  { value: "all", label: "Todos os programas", icon: "list" },
  { value: "favorites", label: "Apenas favoritos", icon: "star" },
  { value: "unused", label: "Nunca usados", icon: "hourglass_empty" },
  { value: "used", label: "Já usados", icon: "task_alt" },
];

const SORT_OPTIONS: ISelectOption<SortMode>[] = [
  { value: "default", label: "Padrão", icon: "sort" },
  { value: "recent", label: "Usado recentemente", icon: "schedule" },
  { value: "most-used", label: "Mais usado", icon: "trending_up" },
  { value: "name", label: "Nome (A–Z)", icon: "sort_by_alpha" },
  { value: "temp", label: "Temperatura máxima", icon: "thermostat" },
  { value: "duration", label: "Tempo total", icon: "timer" },
];

const peakTemp = (p: Program) => Math.max(...p.profile.map((pt) => pt.temp));
const totalTime = (p: Program) => p.profile.at(-1)?.t ?? 0;

/** Parse "dd/mm/aaaa" to a timestamp; "Nunca" (or anything unparseable) sorts oldest. */
function lastUsedTime(value: string): number {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() : 0;
}

/** Programas screen: search/filter/sort over a paginated grid of program management cards. */
export function ProgramasScreen({ programs }: { programs: Program[] }) {
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
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
  const canManage = canManagePrograms(useSession()?.role ?? "Regular");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const favorites = new Set(favoriteIds);
    return allPrograms.filter((p) => {
      if (filterMode === "favorites" && !favorites.has(p.id)) return false;
      if (filterMode === "unused" && p.runCount > 0) return false;
      if (filterMode === "used" && p.runCount === 0) return false;
      return q ? p.name.toLowerCase().includes(q) : true;
    });
  }, [allPrograms, query, filterMode, favoriteIds]);

  const sorted = useMemo(() => {
    if (sortMode === "default") return filtered;
    const arr = [...filtered];
    switch (sortMode) {
      case "recent":
        arr.sort((a, b) => lastUsedTime(b.lastUsed) - lastUsedTime(a.lastUsed));
        break;
      case "most-used":
        arr.sort((a, b) => b.runCount - a.runCount);
        break;
      case "name":
        arr.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        break;
      case "temp":
        arr.sort((a, b) => peakTemp(b) - peakTemp(a));
        break;
      case "duration":
        arr.sort((a, b) => totalTime(b) - totalTime(a));
        break;
    }
    return arr;
  }, [filtered, sortMode]);

  const cols = Math.max(1, Math.floor((w + GAP) / (CARD_MIN_W + GAP)));
  const rows = Math.max(1, Math.floor((h + GAP) / (CARD_MIN_H + GAP)));
  // Fixed row height (the height a full page uses) so the last page keeps the same card size
  // as earlier pages instead of stretching a lone row to fill the grid.
  const rowHeight = h > 0 ? (h - (rows - 1) * GAP) / rows : CARD_MIN_H;
  const perPage = cols * rows;
  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const activePage = Math.min(page, pages - 1);
  const shown = sorted.slice(activePage * perPage, activePage * perPage + perPage);

  return (
    <section className='card flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3'>
        <h1 className='text-2xl font-semibold'>Programas</h1>
        <Link
          href='/'
          aria-label='Fechar'
          className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[var(--hover)]'
        >
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      {/* Search + filter + sort */}
      <div className='flex flex-wrap items-center gap-3'>
        <label className='flex flex-1 items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5'>
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
        <SelectMenu
          icon='filter_list'
          options={FILTER_OPTIONS}
          value={filterMode}
          onChange={(mode) => {
            setFilterMode(mode);
            setPage(0);
          }}
          className='min-w-[13.5rem]'
        />
        <SelectMenu
          icon='swap_vert'
          options={SORT_OPTIONS}
          value={sortMode}
          onChange={(mode) => {
            setSortMode(mode);
            setPage(0);
          }}
          className='min-w-[13.5rem]'
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
        {sorted.length === 0 && <p className='opacity-60'>Nenhum programa encontrado.</p>}
      </div>

      {/* Footer: pagination centered, new program on the right */}
      <footer className='grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
        <span className='text-sm opacity-70'>{`${sorted.length} programa${sorted.length === 1 ? "" : "s"}`}</span>
        <Pagination pages={pages} active={activePage} onChange={setPage} />
        {canManage ? (
          <Link href='/programas/novo' className='btn-action flex cursor-pointer items-center gap-2 justify-self-end rounded-xl px-4 py-2.5 font-semibold'>
            <IconGeneral icon='add' fill={0} className='[--icon-size:1.25rem]' />
            Novo Programa
          </Link>
        ) : (
          <span />
        )}
      </footer>
    </section>
  );
}
