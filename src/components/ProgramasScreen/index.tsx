"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Pagination } from "@/components/Pagination";
import { ProgramListCard } from "@/components/ProgramListCard";
import { SelectMenu, type ISelectOption } from "@/components/SelectMenu";
import { Skeleton } from "@/components/Skeleton";
import { useProgramPage } from "@/hooks/useProgramPage";
import { useSession } from "@/hooks/useSession";
import { canManagePrograms } from "@/lib/auth";
import { PROGRAM_PAGE_SIZE_MAX, PROGRAM_SEARCH_DEBOUNCE_MS } from "@/lib/limits";
import { loadPrograms } from "@/lib/programStore";

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

/** Programas screen: server-paginated grid of program management cards (search/filter/sort). */
export function ProgramasScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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

  // Debounce the search box so typing doesn't fire a request per keystroke; jump back to the first
  // page once the debounced term settles (a new search makes the old page index meaningless).
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(0);
    }, PROGRAM_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const { items, total, loading, loaded } = useProgramPage();
  const canManage = canManagePrograms(useSession()?.role ?? "Regular");

  const cols = Math.max(1, Math.floor((w + GAP) / (CARD_MIN_W + GAP)));
  const rows = Math.max(1, Math.floor((h + GAP) / (CARD_MIN_H + GAP)));
  // Fixed row height (the height a full page uses) so the last page keeps the same card size
  // as earlier pages instead of stretching a lone row to fill the grid.
  const rowHeight = h > 0 ? (h - (rows - 1) * GAP) / rows : CARD_MIN_H;
  const perPage = w > 0 && h > 0 ? cols * rows : 0;
  // The backend clamps pageSize to [1, PROGRAM_PAGE_SIZE_MAX]; clamp here too so the pager math
  // matches what the server actually returns (otherwise a huge grid would over-count the pages).
  const effectivePerPage = perPage > 0 ? Math.min(perPage, PROGRAM_PAGE_SIZE_MAX) : 0;
  const pages = Math.max(1, Math.ceil(total / Math.max(1, effectivePerPage)));
  // Clamp the requested page into range so a smaller page count (fewer matches, or a larger grid)
  // can't leave us past the end; the fetch below keys off this clamped value. The page is reset to 0
  // on a filter/sort change in the controls' onChange handlers and on a new search in the debounce.
  const activePage = Math.min(page, pages - 1);

  // Fetch the current page from the backend. Guard against firing before the grid is measured
  // (effectivePerPage 0 would request pageSize 0). `activePage` is 0-based here; the API is 1-based.
  useEffect(() => {
    if (effectivePerPage <= 0) return;
    void loadPrograms({
      search: debouncedQuery || undefined,
      filter: filterMode,
      sort: sortMode,
      page: activePage + 1,
      pageSize: effectivePerPage,
    });
  }, [debouncedQuery, filterMode, sortMode, activePage, effectivePerPage]);

  return (
    <section className='card flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-(--border) pb-3'>
        <h1 className='text-2xl font-semibold'>Programas</h1>
        <Link
          href='/'
          aria-label='Fechar'
          className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-(--hover)'
        >
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      {/* Search + filter + sort */}
      <div className='flex flex-wrap items-center gap-3'>
        <label className='flex flex-1 items-center gap-2 rounded-xl border border-(--border) px-4 py-2.5'>
          <IconGeneral icon='search' fill={0} className='shrink-0 opacity-70 [--icon-size:1.25rem]' />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
        {items.map((program) => (
          <ProgramListCard key={program.id} program={program} />
        ))}
        {items.length === 0 &&
          (loading || !loaded) &&
          effectivePerPage > 0 &&
          Array.from({ length: Math.min(effectivePerPage, 12) }).map((_, i) => <Skeleton key={`sk-${i}`} className='h-full w-full' />)}
        {loaded && !loading && total === 0 && <p className='opacity-60'>Nenhum programa encontrado.</p>}
      </div>

      {/* Footer: pagination centered, new program on the right */}
      <footer className='grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
        <span className='text-sm opacity-70'>{`${total} programa${total === 1 ? "" : "s"}`}</span>
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
