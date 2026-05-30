import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * A rounded, bordered scroll container for tables. The scrollbar is kept clear of both the
 * border and the content:
 *  - border + radius live on the OUTER wrapper (with `overflow-hidden`), and its `pr-2` insets
 *    the inner scroller — so the scrollbar floats a few px inside the rounded border instead of
 *    sitting on the border line (overlay scrollbars in Firefox paint at the scroller's edge);
 *  - the inner scroller adds `pr-3` (+ `scrollbar-gutter:stable` for classic bars) so the
 *    content keeps a gap from the bar too.
 * See the scroll-gutter note in CLAUDE.md.
 */
export function TableScrollBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("h-full overflow-hidden rounded-xl border border-white/10 pr-2", className)}>
      <div className='h-full overflow-auto pr-3 [scrollbar-gutter:stable]'>{children}</div>
    </div>
  );
}
