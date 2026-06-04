import { clsx } from "clsx";

/**
 * A pulsing placeholder for content that's still loading — compose it (sized via `className`) into
 * skeleton cards/rows so a screen shows its shape instead of a "Carregando..." line. `aria-hidden`
 * since it's purely decorative.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden='true' className={clsx("animate-pulse rounded-lg bg-(--surface-2)", className)} />;
}

/** `rows` skeleton table rows, each with `cols` placeholder cells — drop into a <tbody> while it loads. */
export function SkeletonRows({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return Array.from({ length: rows }).map((_, r) => (
    <tr key={`sk-${r}`} className='border-t border-(--border) [&>td]:px-4 [&>td]:py-3'>
      {Array.from({ length: cols }).map((_, c) => (
        <td key={c}>
          <Skeleton className='h-4 w-full' />
        </td>
      ))}
    </tr>
  ));
}
