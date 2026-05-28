"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { type LogLevel, MOCK_LOGS } from "@/lib/logs";
import { Segmented } from "./fields";

const LEVEL_STYLE: Record<LogLevel, { icon: string; cls: string }> = {
  INFO: { icon: "info", cls: "text-[var(--brand)]" },
  Aviso: { icon: "warning", cls: "text-amber-400" },
  Erro: { icon: "error", cls: "text-red-400" },
};

type Filter = "all" | LogLevel;
const FILTER_OPTIONS: { value: Filter; label: string; icon: string }[] = [
  { value: "all", label: "Todos", icon: "list" },
  { value: "INFO", label: "INFO", icon: "info" },
  { value: "Aviso", label: "Aviso", icon: "warning" },
  { value: "Erro", label: "Erro", icon: "error" },
];

/** Scrollable system log (mock), filterable by level. */
export function SystemLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const logs = filter === "all" ? MOCK_LOGS : MOCK_LOGS.filter((l) => l.level === filter);

  return (
    <Modal open={open} title='Log do Sistema' onClose={onClose} panelClassName='h-[85vh] w-[90vw] max-w-3xl'>
      <div className='flex h-full flex-col gap-3'>
        <Segmented options={FILTER_OPTIONS} value={filter} onChange={setFilter} label='Filtrar por nível' />
        <div className='min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10'>
          <ul className='divide-y divide-white/5 text-sm'>
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
        </div>
      </div>
    </Modal>
  );
}
