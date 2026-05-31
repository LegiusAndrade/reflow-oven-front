"use client";

import { clsx } from "clsx";
import { useEffect, useReducer, useRef, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { TableScrollBox } from "@/components/TableScrollBox";
import { api, ApiError, type SystemLogLevelWire, type SystemLogRow } from "@/lib/api";
import { LOG_RING_MAX, REPORT_PAGE_SIZE_MAX, SYSTEM_LOG_POLL_MS } from "@/lib/limits";
import { logger, type LogLevel } from "@/lib/logger";
import { showToast } from "@/lib/toast";
import { Segmented } from "./fields";

/**
 * Diagnóstico → Log (visível só para o usuário Master). Duas fontes:
 *  - **Navegador:** o ring buffer em memória do `logger` (rotas, auth, erros de API/SignalR) — ao
 *    vivo via subscribe; some ao recarregar a página; teto de `LOG_RING_MAX` linhas.
 *  - **Sistema:** o `GET /api/system-log` do backend, atualizado por polling
 *    (`SYSTEM_LOG_POLL_MS`) enquanto não há hub SignalR de push.
 */
type Source = "navegador" | "sistema";

const SOURCE_OPTIONS: { value: Source; label: string; icon: string }[] = [
  { value: "navegador", label: "Navegador", icon: "terminal" },
  { value: "sistema", label: "Sistema", icon: "dns" },
];

export function DiagnosticoLog() {
  const [source, setSource] = useState<Source>("navegador");
  return (
    <div className='flex h-full min-h-0 flex-col gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Segmented options={SOURCE_OPTIONS} value={source} onChange={setSource} label='Fonte do log' />
        <span className='text-xs opacity-60'>
          {source === "navegador" ? "Em memória do navegador — some ao recarregar." : `Servidor — atualiza a cada ${Math.round(SYSTEM_LOG_POLL_MS / 1000)}s.`}
        </span>
      </div>
      {source === "navegador" ? <BrowserLog /> : <SystemLog />}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

// --- Navegador --------------------------------------------------------------------------

const BROWSER_STYLE: Record<LogLevel, { cls: string; icon: string }> = {
  info: { cls: "text-[var(--brand)]", icon: "info" },
  warn: { cls: "text-amber-700 dark:text-amber-400", icon: "warning" },
  error: { cls: "text-red-700 dark:text-red-400", icon: "error" },
};

const fmtClock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds() / 10)}`;
};

/** Compact one-line preview of a log entry's `data` payload (objects get JSON, truncated). */
function previewData(data: unknown): string {
  if (data === undefined || data === null) return "";
  try {
    const s = typeof data === "string" ? data : JSON.stringify(data);
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  } catch {
    return String(data);
  }
}

function BrowserLog() {
  // The ring is mutated in place, so we force a re-render on each new entry instead of snapshotting.
  const [, bump] = useReducer((n) => n + 1, 0);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    if (paused) return;
    return logger.subscribe(bump);
  }, [paused]);

  const entries = logger.history();

  // Auto-scroll to the newest line, but only if the user was already at the bottom (don't yank them
  // up while they're reading older lines).
  useEffect(() => {
    if (paused) return;
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  });

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-2'>
      <div className='flex items-center justify-between gap-3'>
        <span className='text-sm opacity-70 tabular-nums'>
          {entries.length}/{LOG_RING_MAX} linhas
        </span>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setPaused((p) => !p)}
            className='btn-press flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--hover)]'
          >
            <IconGeneral icon={paused ? "play_arrow" : "pause"} fill={0} className='[--icon-size:1.125rem]' />
            {paused ? "Retomar" : "Pausar"}
          </button>
          <button
            type='button'
            onClick={() => logger.clear()}
            className='btn-press flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-400'
          >
            <IconGeneral icon='delete_sweep' fill={0} className='[--icon-size:1.125rem]' />
            Limpar
          </button>
        </div>
      </div>

      {/* Rounded/bordered scroll box (gutter convention) — ref on the inner scroller for autoscroll. */}
      <div className='min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] pr-2'>
        <div ref={scrollRef} onScroll={onScroll} className='h-full overflow-y-auto pr-3 [scrollbar-gutter:stable] font-mono text-xs'>
          {entries.map((e, i) => {
            const style = BROWSER_STYLE[e.level];
            const data = previewData(e.data);
            return (
              <div key={i} className='flex items-start gap-2 border-b border-[var(--border)] px-2 py-1 last:border-0'>
                <span className='shrink-0 tabular-nums opacity-50'>{fmtClock(e.at)}</span>
                <IconGeneral icon={style.icon} fill={1} className={clsx("mt-0.5 shrink-0", style.cls, "[--icon-size:0.9rem]")} />
                <span className='shrink-0 font-semibold opacity-70'>[{e.scope}]</span>
                <span className='min-w-0 break-words'>
                  {e.message}
                  {data && <span className='opacity-50'> {data}</span>}
                </span>
              </div>
            );
          })}
          {entries.length === 0 && <div className='px-3 py-6 text-center opacity-60'>Nenhuma entrada ainda. Navegue pelo app para gerar logs.</div>}
        </div>
      </div>
    </div>
  );
}

// --- Sistema ----------------------------------------------------------------------------

const SYS_STYLE: Record<SystemLogLevelWire, { icon: string; cls: string }> = {
  INFO: { icon: "info", cls: "text-[var(--brand)]" },
  Aviso: { icon: "warning", cls: "text-amber-700 dark:text-amber-400" },
  Erro: { icon: "error", cls: "text-red-700 dark:text-red-400" },
};

type SysFilter = "all" | SystemLogLevelWire;
const SYS_FILTER_OPTIONS: { value: SysFilter; label: string; icon: string }[] = [
  { value: "all", label: "Todos", icon: "list" },
  { value: "INFO", label: "INFO", icon: "info" },
  { value: "Aviso", label: "Aviso", icon: "warning" },
  { value: "Erro", label: "Erro", icon: "error" },
];

const fmtStamp = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

function SystemLog() {
  const [filter, setFilter] = useState<SysFilter>("all");
  const [rows, setRows] = useState<SystemLogRow[]>([]);
  const [failed, setFailed] = useState(false);

  // Poll the server log while this view is open; the filter is forwarded to the server.
  useEffect(() => {
    let alive = true;
    const tick = () =>
      api
        .systemLog({ page: 1, pageSize: REPORT_PAGE_SIZE_MAX, level: filter === "all" ? undefined : filter })
        .then((res) => {
          if (!alive) return;
          setRows(res.items);
          setFailed(false);
        })
        .catch((e) => {
          if (!alive) return;
          setFailed(true);
          // Surface a transient hiccup once; the dedupe in showToast prevents spam across ticks.
          showToast(e instanceof ApiError ? e.message : "Falha ao carregar o log do sistema", "error");
        });
    void tick();
    const id = window.setInterval(tick, SYSTEM_LOG_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [filter]);

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-2'>
      <Segmented options={SYS_FILTER_OPTIONS} value={filter} onChange={setFilter} label='Filtrar por nível' />
      <TableScrollBox className='min-h-0 flex-1'>
        <ul className='divide-y divide-[var(--border)] text-sm'>
          {rows.map((l, i) => {
            const style = SYS_STYLE[l.level];
            return (
              <li key={i} className='flex items-start gap-3 px-3 py-2'>
                <span className='shrink-0 tabular-nums opacity-60'>{fmtStamp(l.at)}</span>
                <span className={clsx("inline-flex w-20 shrink-0 items-center gap-1 font-medium", style.cls)}>
                  <IconGeneral icon={style.icon} fill={1} className='[--icon-size:1.125rem]' />
                  {l.level}
                </span>
                <span className='flex-1'>{l.message}</span>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className='px-3 py-6 text-center opacity-60'>{failed ? "Não foi possível carregar o log do sistema." : "Nenhum registro."}</li>
          )}
        </ul>
      </TableScrollBox>
    </div>
  );
}
