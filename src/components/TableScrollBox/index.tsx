import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * A rounded, bordered scroll container for tables. Two things make the scrollbar behave:
 *  - the border + radius live on the OUTER wrapper (with `overflow-hidden`) so the inner
 *    scrollbar is clipped to the rounded shape instead of poking the corners;
 *  - the inner scroller reserves the scrollbar lane with `scrollbar-gutter: stable`, so the
 *    bar never sits ON TOP of the content (overlay scrollbars) nor shifts it (classic).
 * See the scroll-gutter note in CLAUDE.md.
 */
export function TableScrollBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("h-full overflow-hidden rounded-xl border border-white/10", className)}>
      <div className='h-full overflow-auto [scrollbar-gutter:stable]'>{children}</div>
    </div>
  );
}
