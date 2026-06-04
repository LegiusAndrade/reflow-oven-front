import { clsx } from "clsx";

/**
 * A pulsing placeholder for content that's still loading — compose it (sized via `className`) into
 * skeleton cards/rows so a screen shows its shape instead of a "Carregando..." line. `aria-hidden`
 * since it's purely decorative.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden='true' className={clsx("animate-pulse rounded-lg bg-(--surface-2)", className)} />;
}
