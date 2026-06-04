import { clsx } from "clsx";
import type { UserStatus } from "@/lib/users";

/** Ativo / Inativo pill with a status dot. */
export function UserStatusBadge({ status }: { status: UserStatus }) {
  const active = status === "Ativo";
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-medium", active ? "text-emerald-700 dark:text-emerald-400" : "opacity-60")}>
      <span className={clsx("size-2 rounded-full", active ? "bg-emerald-400" : "bg-current")} aria-hidden='true' />
      {status}
    </span>
  );
}
