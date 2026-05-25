"use client";

import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { ProgramCard } from "@/components/ProgramCard";
import { useStoredPrograms } from "@/hooks/useStoredPrograms";
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
 * exactly one card fits, so it behaves like the original single-chart carousel.
 */
export function ProgramGallery({ programs }: { programs: Program[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(0);

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

  const stored = useStoredPrograms();
  const allPrograms = useMemo(() => {
    const storedIds = new Set(stored.map((p) => p.id));
    return [...stored, ...programs.filter((p) => !storedIds.has(p.id))];
  }, [stored, programs]);

  const cols = Math.max(1, Math.floor((w + GAP) / (CARD_MIN_W + GAP)));
  const rows = Math.max(1, Math.floor((h + GAP) / (CARD_MIN_H + GAP)));
  const perPage = cols * rows;
  const pages = Math.max(1, Math.ceil(allPrograms.length / perPage));
  const activePage = Math.min(Math.max(page, 0), pages - 1);
  const shown = allPrograms.slice(activePage * perPage, activePage * perPage + perPage);

  return (
    <div className='relative h-full w-full'>
      {/* Side gutters (px-16) give the overlay arrows room so they don't sit on the chart. */}
      <div
        ref={ref}
        className='grid h-full w-full px-16'
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "1fr", gap: `${GAP}px` }}
      >
        {shown.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))}
      </div>

      {pages > 1 && (
        <>
          <PageArrow direction='prev' onClick={() => setPage(activePage - 1)} disabled={activePage === 0} className='left-1' />
          <PageArrow direction='next' onClick={() => setPage(activePage + 1)} disabled={activePage === pages - 1} className='right-1' />
        </>
      )}
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
