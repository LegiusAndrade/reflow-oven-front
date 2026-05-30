"use client";

import { clsx } from "clsx";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import type { ChangeAction, ErrorSeverity, ExecutionStatus } from "@/lib/reports";

/** Execution status pill (Concluído / Falha), used in the table and the detail view. */
export function StatusBadge({ status }: { status: ExecutionStatus }) {
  const ok = status === "Concluído";
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-medium", ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
      <IconGeneral icon={ok ? "check_circle" : "cancel"} fill={1} className='[--icon-size:1.25rem]' />
      {status}
    </span>
  );
}

const ACTION_STYLE: Record<ChangeAction, { icon: string; cls: string }> = {
  Criado: { icon: "add_circle", cls: "text-emerald-700 dark:text-emerald-400" },
  Editado: { icon: "edit", cls: "text-[var(--brand)]" },
  Removido: { icon: "delete", cls: "text-red-700 dark:text-red-400" },
};

/** Change-action pill (Criado / Editado / Removido). */
export function ActionBadge({ action }: { action: ChangeAction }) {
  const style = ACTION_STYLE[action];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-medium", style.cls)}>
      <IconGeneral icon={style.icon} fill={1} className='[--icon-size:1.25rem]' />
      {action}
    </span>
  );
}

const SEVERITY_STYLE: Record<ErrorSeverity, { icon: string; cls: string }> = {
  Crítico: { icon: "error", cls: "text-red-700 dark:text-red-400" },
  Alerta: { icon: "warning", cls: "text-amber-700 dark:text-amber-400" },
  Aviso: { icon: "info", cls: "text-[var(--brand)]" },
};

/** Fault severity pill (Crítico / Alerta / Aviso). */
export function SeverityBadge({ severity }: { severity: ErrorSeverity }) {
  const style = SEVERITY_STYLE[severity];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-medium", style.cls)}>
      <IconGeneral icon={style.icon} fill={1} className='[--icon-size:1.25rem]' />
      {severity}
    </span>
  );
}
