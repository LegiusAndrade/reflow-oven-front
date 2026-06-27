"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { ProgramCard } from "@/components/ProgramCard";
import { RunModal } from "@/components/RunModal";
import { useProgramPage } from "@/hooks/useProgramPage";
import { useStore } from "@/hooks/useStore";
import { faultStore } from "@/lib/faults";
import { PROGRAM_PAGE_SIZE_MAX } from "@/lib/limits";
import { loadPrograms } from "@/lib/programStore";
import type { Program } from "@/lib/programs";

// Minimum comfortable card size; drives how many fit per page.
// (Tuned together with the side gutters below so 1 card fits at 1024px, 2 at ~1280.)
const CARD_MIN_W = 520;
const CARD_MIN_H = 360;
const GAP = 16;

/**
 * Responsive, paginated grid of program cards. It measures the available area and shows
 * as many cards as fit (more columns when wider, more rows when taller); the rest are
 * reached with the prev/next arrows. No scrollbar — overflow becomes pages. At 1024×600
 * exactly one card fits, so it behaves like the original single-chart carousel. Pages are
 * fetched from the backend on demand (server-side pagination).
 */
export function ProgramGallery() {
  const ref = useRef<HTMLDivElement>(null);
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(0);
  const [runProgram, setRunProgram] = useState<Program | null>(null);
  // A latched board fault blocks starting any run (the fault banner explains/clears it). Fed by the
  // same 1 Hz diagnostics tick AppShell already subscribes to — no extra connection here.
  const faulted = useStore(faultStore) != null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { items, total } = useProgramPage();

  const cols = Math.max(1, Math.floor((w + GAP) / (CARD_MIN_W + GAP)));
  const rows = Math.max(1, Math.floor((h + GAP) / (CARD_MIN_H + GAP)));
  const perPage = w > 0 && h > 0 ? cols * rows : 0;
  // The backend clamps pageSize to [1, PROGRAM_PAGE_SIZE_MAX]; clamp here too so the pager math
  // matches what the server actually returns.
  const effectivePerPage = perPage > 0 ? Math.min(perPage, PROGRAM_PAGE_SIZE_MAX) : 0;
  const pages = Math.max(1, Math.ceil(total / Math.max(1, effectivePerPage)));
  // Clamp the requested page into range so a smaller page count (e.g. a larger grid fitting more
  // cards per page) can't leave us past the end; the fetch below keys off this clamped value.
  const activePage = Math.min(Math.max(page, 0), pages - 1);

  // Fetch the current page once the grid is measured. `activePage` is 0-based here; the API is 1-based.
  useEffect(() => {
    if (effectivePerPage <= 0) return;
    void loadPrograms({ filter: "all", sort: "default", page: activePage + 1, pageSize: effectivePerPage });
  }, [activePage, effectivePerPage]);

  return (
    <div className='relative h-full w-full'>
      {/* Side gutters (px-16) give the overlay arrows room so they don't sit on the chart. */}
      <div
        ref={ref}
        className='grid h-full w-full px-16'
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "1fr", gap: `${GAP}px` }}
      >
        {items.map((program) => (
          <ProgramCard key={program.id} program={program} onStart={() => setRunProgram(program)} disabled={faulted} />
        ))}
      </div>

      {pages > 1 && (
        <>
          <PageArrow direction='prev' onClick={() => setPage(activePage - 1)} disabled={activePage === 0} className='left-1' />
          <PageArrow direction='next' onClick={() => setPage(activePage + 1)} disabled={activePage === pages - 1} className='right-1' />
        </>
      )}

      {runProgram && <RunModal program={runProgram} onClose={() => setRunProgram(null)} />}
    </div>
  );
}

interface IPageArrowProps {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

function PageArrow({ direction, onClick, disabled, className }: IPageArrowProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Programas anteriores" : "Próximos programas"}
      className={clsx(
        "absolute top-1/2 z-10 grid size-12 -translate-y-1/2 scale-100 cursor-pointer place-items-center rounded-full bg-black/40 backdrop-blur-sm transition duration-150 hover:scale-110 hover:bg-black/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-black/40",
        className
      )}
    >
      {/* chevron_left mirrored for "next" so both arrows share identical metrics */}
      <IconGeneral icon='chevron_left' fill={0} className={clsx("[--icon-size:36px]", direction === "next" && "-scale-x-100")} />
    </button>
  );
}
