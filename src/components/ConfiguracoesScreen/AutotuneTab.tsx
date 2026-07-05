"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { TableScrollBox } from "@/components/TableScrollBox";
import { api, ApiError, type AutotuneRunDto, type AutotuneStatus, type AutotuneStatusDto } from "@/lib/api";
import { AUTOTUNE_TARGET_DEFAULT, AUTOTUNE_TARGET_MAX, AUTOTUNE_TARGET_MIN } from "@/lib/limits";
import { showToast } from "@/lib/toast";
import { FieldGroup, NumberField } from "./fields";

const HISTORY_PAGE_SIZE = 10;

const pad = (n: number) => String(n).padStart(2, "0");
const fmtStamp = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtDuration = (s: number): string => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
/** PID gains print to 3 decimals; null (a tune that hasn't produced them) reads as a dash. */
const fmtGain = (n: number | null | undefined): string => (n == null ? "—" : n.toFixed(3));

const STATUS_STYLE: Record<AutotuneStatus, string> = {
  Executando: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
  Concluído: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  Falha: "bg-red-500/20 text-red-700 dark:text-red-400",
  Cancelado: "bg-black/10 text-fg dark:bg-white/15",
};

/** Configurações → Autotune (technician/calibration session): trigger the relay PID auto-tune, watch it
 *  live, and apply/dismiss the suggested gains. start/cancel/apply/dismiss are CalibrationOnly server-side;
 *  the tab itself only mounts for the calibration session. */
export function AutotuneTab() {
  const [status, setStatus] = useState<AutotuneStatusDto | null>(null);
  const [target, setTarget] = useState(AUTOTUNE_TARGET_DEFAULT);
  const [busy, setBusy] = useState(false);
  const [confirmApply, setConfirmApply] = useState<AutotuneRunDto | null>(null);
  const [history, setHistory] = useState<{ items: AutotuneRunDto[]; total: number } | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [historyKey, setHistoryKey] = useState(0);

  const running = status?.running ?? false;

  // Poll the live status — 1 Hz while a tune runs, lazily otherwise (still catches one started elsewhere).
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .autotuneStatus()
        .then((s) => alive && setStatus(s))
        .catch(() => undefined);
    load();
    const id = setInterval(load, running ? 1000 : 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [running]);

  // History page — reloads after an action via historyKey. A load error becomes an explicit failed
  // state (toast + distinct message), not an empty "Nenhum auto-tune ainda." that hides the outage.
  useEffect(() => {
    let alive = true;
    api
      .autotuneHistory(page, HISTORY_PAGE_SIZE)
      .then((h) => {
        if (!alive) return;
        setHistory({ items: h.items, total: h.total });
        setHistoryFailed(false);
      })
      .catch((e) => {
        if (!alive) return;
        setHistoryFailed(true);
        setHistory({ items: [], total: 0 });
        showToast(e instanceof ApiError ? e.message : "Falha ao carregar o histórico de auto-tune", "error");
      });
    return () => {
      alive = false;
    };
  }, [page, historyKey]);

  const reload = () => {
    setHistoryKey((k) => k + 1);
    api
      .autotuneStatus()
      .then(setStatus)
      .catch(() => undefined);
  };

  const start = async () => {
    setBusy(true);
    try {
      setStatus(await api.startAutotune(target));
      showToast("Auto-tune iniciado");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao iniciar o auto-tune", "error");
    }
    setBusy(false);
  };

  const cancel = async () => {
    setBusy(true);
    try {
      setStatus(await api.cancelAutotune());
      showToast("Auto-tune cancelado");
      reload();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao cancelar o auto-tune", "error");
    }
    setBusy(false);
  };

  const doApply = async () => {
    if (!confirmApply) return;
    const run = confirmApply;
    setConfirmApply(null);
    try {
      await api.applyAutotune(run.id);
      showToast("Ganhos aplicados às Configurações");
      reload();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao aplicar os ganhos", "error");
    }
  };

  const dismiss = async (run: AutotuneRunDto) => {
    try {
      await api.dismissAutotune(run.id);
      showToast("Sugestão descartada");
      reload();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao descartar", "error");
    }
  };

  const cur = status?.current ?? null;
  const pending = cur && cur.status === "Concluído" && !cur.applied && !cur.dismissed ? cur : null;
  const totalPages = history ? Math.max(1, Math.ceil(history.total / HISTORY_PAGE_SIZE)) : 1;

  return (
    <div className='flex h-full min-h-0 flex-col gap-5'>
      <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-3 scrollbar-gutter-stable'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300'>Modo técnico</span>
          <p className='text-sm opacity-70'>Auto-tune do PID por relé na placa — oscila em torno do alvo e sugere Kp/Ki/Kd.</p>
        </div>

        <FieldGroup title='Disparar auto-tune'>
          <NumberField label='Temperatura de oscilação' value={target} onChange={setTarget} min={AUTOTUNE_TARGET_MIN} max={AUTOTUNE_TARGET_MAX} unit='°C' className='flex-1' />
          <div className='flex items-end'>
            {running ? (
              <button
                type='button'
                onClick={cancel}
                disabled={busy}
                className='btn-press flex h-[2.875rem] cursor-pointer items-center gap-2 rounded-xl border border-red-500/40 px-5 font-semibold text-red-700 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400'
              >
                <IconGeneral icon='stop' fill={0} className='[--icon-size:1.25rem]' />
                Cancelar
              </button>
            ) : (
              <button type='button' onClick={start} disabled={busy} className='btn-action flex h-[2.875rem] cursor-pointer items-center gap-2 rounded-xl px-5 font-semibold disabled:opacity-50'>
                <IconGeneral icon='science' fill={0} className='[--icon-size:1.25rem]' />
                Iniciar
              </button>
            )}
          </div>
        </FieldGroup>

        {running && cur && (
          <div className='flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-(--border) bg-(--surface-inset) p-4'>
            <span className='flex items-center gap-2 font-semibold'>
              <IconGeneral icon='progress_activity' fill={0} className='animate-spin [--icon-size:1.25rem]' />
              Em andamento
            </span>
            <Stat label='Alvo' value={`${cur.targetTemp.toFixed(0)} °C`} />
            <Stat label='Ciclos' value={String(cur.cycles)} />
            <Stat label='Decorrido' value={fmtDuration(cur.durationSeconds)} />
          </div>
        )}

        {pending && (
          <div className='flex flex-col gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4'>
            <div className='flex items-center gap-2 font-semibold'>
              <IconGeneral icon='check_circle' fill={0} className='text-emerald-600 [--icon-size:1.25rem] dark:text-emerald-400' />
              Auto-tune concluído — ganhos sugeridos
            </div>
            <div className='flex flex-wrap gap-x-6 gap-y-2'>
              <GainDelta label='Kp' from={pending.prevKp} to={pending.kp} />
              <GainDelta label='Ki' from={pending.prevKi} to={pending.ki} />
              <GainDelta label='Kd' from={pending.prevKd} to={pending.kd} />
              {pending.ku != null && <Stat label='Ku' value={fmtGain(pending.ku)} />}
              {pending.tuMs != null && <Stat label='Tu' value={`${(pending.tuMs / 1000).toFixed(2)} s`} />}
            </div>
            <div className='flex flex-wrap gap-3'>
              <button type='button' onClick={() => setConfirmApply(pending)} className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'>
                <IconGeneral icon='done' fill={0} className='[--icon-size:1.25rem]' />
                Aplicar ganhos
              </button>
              <button type='button' onClick={() => dismiss(pending)} className='btn-press cursor-pointer rounded-xl border border-(--border) px-5 py-2.5 font-semibold hover:bg-(--hover)'>
                Descartar
              </button>
            </div>
          </div>
        )}

        <section className='flex min-h-0 flex-1 flex-col gap-2'>
          <div className='flex items-center justify-between gap-2'>
            <h3 className='font-semibold'>Histórico {history ? `(${history.total})` : ""}</h3>
            {totalPages > 1 && (
              <div className='flex items-center gap-1 text-sm'>
                <PagerButton icon='chevron_left' disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
                <span className='tabular-nums opacity-70'>
                  {page}/{totalPages}
                </span>
                <PagerButton icon='chevron_right' disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
              </div>
            )}
          </div>
          <HistoryList items={history?.items ?? null} failed={historyFailed} />
        </section>
      </div>

      <ConfirmDialog
        open={confirmApply !== null}
        tone='default'
        icon='tune'
        title='Aplicar os ganhos sugeridos?'
        description={confirmApply ? `Kp/Ki/Kd passam para ${fmtGain(confirmApply.kp)} / ${fmtGain(confirmApply.ki)} / ${fmtGain(confirmApply.kd)} nas Configurações e vão para a placa.` : ""}
        confirmLabel='Aplicar'
        cancelLabel='Voltar'
        onConfirm={doApply}
        onCancel={() => setConfirmApply(null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className='flex flex-col'>
      <span className='text-xs opacity-50'>{label}</span>
      <span className='font-semibold tabular-nums'>{value}</span>
    </span>
  );
}

/** A "before → after" gain pair (the previous value dimmed, the suggested one full). */
function GainDelta({ label, from, to }: { label: string; from: number; to: number | null | undefined }) {
  return (
    <span className='flex flex-col'>
      <span className='text-xs opacity-50'>{label}</span>
      <span className='font-semibold tabular-nums'>
        <span className='opacity-50'>{fmtGain(from)}</span> → {fmtGain(to)}
      </span>
    </span>
  );
}

function PagerButton({ icon, disabled, onClick }: { icon: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className='btn-press grid size-8 cursor-pointer place-items-center rounded-lg hover:bg-(--hover) disabled:cursor-not-allowed disabled:opacity-30'
    >
      <IconGeneral icon={icon} fill={0} className='[--icon-size:1.25rem]' />
    </button>
  );
}

function HistoryList({ items, failed }: { items: AutotuneRunDto[] | null; failed?: boolean }) {
  if (items === null) {
    return (
      <div className='flex min-h-0 flex-1 items-center justify-center gap-2 opacity-60'>
        <IconGeneral icon='progress_activity' fill={0} className='animate-spin [--icon-size:1.5rem]' />
        <span className='text-sm'>Carregando…</span>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className='flex min-h-0 flex-1 items-center justify-center text-sm opacity-60'>
        {failed ? "Não foi possível carregar o histórico." : "Nenhum auto-tune ainda."}
      </div>
    );
  }
  return (
    <TableScrollBox className='min-h-0 flex-1'>
      <ul className='divide-y divide-(--border)'>
        {items.map((r) => (
          <li key={r.id} className='flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2.5'>
            <span className='flex w-40 flex-col gap-1'>
              <span className='flex items-center gap-2'>
                <StatusBadge status={r.status} />
                {r.applied && <span className='text-xs font-medium text-emerald-700 dark:text-emerald-400'>aplicado</span>}
              </span>
              <span className='text-xs opacity-50 tabular-nums'>{fmtStamp(r.startedAt)}</span>
            </span>
            <Stat label='Alvo' value={`${r.targetTemp.toFixed(0)} °C`} />
            <Stat label='Ciclos' value={String(r.cycles)} />
            <Stat label='Kp/Ki/Kd' value={`${fmtGain(r.kp)} / ${fmtGain(r.ki)} / ${fmtGain(r.kd)}`} />
            <Stat label='Por' value={r.triggeredBy ?? "técnico"} />
            {r.status === "Falha" && (
              <span className='text-xs text-red-700 dark:text-red-400'>
                {r.faultCode ? `${r.faultCode} · ` : ""}
                {r.errorReason ?? "falha"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </TableScrollBox>
  );
}

function StatusBadge({ status }: { status: AutotuneStatus }) {
  return <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[status])}>{status}</span>;
}
