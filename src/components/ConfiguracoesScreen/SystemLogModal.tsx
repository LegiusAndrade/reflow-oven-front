"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { TableScrollBox } from "@/components/TableScrollBox";
import { api } from "@/lib/api";
import { type LogEntry, type LogLevel } from "@/lib/logs";
import { Segmented } from "./fields";

const LEVEL_STYLE: Record<LogLevel, { icon: string; cls: string }> = {
  INFO: { icon: "info", cls: "text-[var(--brand)]" },
  Aviso: { icon: "warning", cls: "text-amber-700 dark:text-amber-400" },
  Erro: { icon: "error", cls: "text-red-700 dark:text-red-400" },
};

type Filter = "all" | LogLevel;
const FILTER_OPTIONS: { value: Filter; label: string; icon: string }[] = [
  { value: "all", label: "Todos", icon: "list" },
  { value: "INFO", label: "INFO", icon: "info" },
  { value: "Aviso", label: "Aviso", icon: "warning" },
  { value: "Erro", label: "Erro", icon: "error" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const fmtLog = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** Scrollable system log from the API, filterable by level. */
export function SystemLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [base, setBase] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    api
      .systemLog({ pageSize: 200 })
      .then((res) => {
        const items = (res as { items: { at: string; level: LogLevel; message: string }[] }).items;
        setBase(items.map((l) => ({ at: fmtLog(l.at), level: l.level, message: l.message })));
      })
      .catch(() => {});
  }, [open]);

  const logs = filter === "all" ? base : base.filter((l) => l.level === filter);

  return (
    <Modal open={open} title='Log do Sistema' onClose={onClose} panelClassName='h-[85vh] w-[90vw] max-w-3xl'>
      <div className='flex h-full flex-col gap-3'>
        <Segmented options={FILTER_OPTIONS} value={filter} onChange={setFilter} label='Filtrar por nível' />
        <TableScrollBox className='min-h-0 flex-1'>
          <ul className='divide-y divide-[var(--border)] text-sm'>
            {logs.map((l, i) => {
              const style = LEVEL_STYLE[l.level];
              return (
                <li key={i} className='flex items-start gap-3 px-3 py-2'>
                  <span className='shrink-0 tabular-nums opacity-60'>{l.at}</span>
                  <span className={clsx("inline-flex w-20 shrink-0 items-center gap-1 font-medium", style.cls)}>
                    <IconGeneral icon={style.icon} fill={1} className='[--icon-size:1.125rem]' />
                    {l.level}
                  </span>
                  <span className='flex-1'>{l.message}</span>
                </li>
              );
            })}
            {logs.length === 0 && <li className='px-3 py-6 text-center opacity-60'>Nenhum registro.</li>}
          </ul>
        </TableScrollBox>
      </div>
    </Modal>
  );
}
