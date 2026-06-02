"use client";

import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useStore } from "@/hooks/useStore";
import { api, ApiError, getToken, type SystemMetricsDto, type UpdateStatusDto } from "@/lib/api";
import { canAdminister, sessionStore } from "@/lib/auth";
import { DEVICE_INFO, REPO_URL, type BoardInfo, type DeviceInfo } from "@/lib/deviceInfo";
import { SYSTEM_METRICS_POLL_MS } from "@/lib/limits";
import { showToast } from "@/lib/toast";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className='flex items-start gap-3'>
      <IconGeneral icon={icon} fill={0} className='mt-0.5 shrink-0 text-[var(--brand)] [--icon-size:1.5rem]' />
      <div className='min-w-0'>
        <dt className='text-sm opacity-70'>{label}</dt>
        <dd className='font-semibold tabular-nums'>{value}</dd>
      </div>
    </div>
  );
}

/**
 * CPU load row — owns its own polling so the 5 s tick only re-renders this row, not the whole
 * Informação tree (QR code, board cards). Failures are ignored so a transient hiccup keeps the
 * last value; the interval is cleared on unmount.
 */
function CpuLoadRow() {
  const [metrics, setMetrics] = useState<SystemMetricsDto | null>(null);
  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    const tick = () =>
      api
        .systemMetrics()
        .then(m => alive && setMetrics(m))
        .catch(() => {});
    void tick();
    const id = window.setInterval(tick, SYSTEM_METRICS_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);
  const value = metrics ? `${Math.round(metrics.cpuLoadPercent)}%${metrics.cpuTempC != null ? ` · ${Math.round(metrics.cpuTempC)}°C` : ""}` : "—";
  return <InfoRow icon='speed' label='Carga da CPU' value={value} />;
}

/** A titled info block (border + subtle fill + icon header) — the shared card chrome. */
function InfoCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] p-4'>
      <header className='flex items-center gap-2 border-b border-[var(--border)] pb-2'>
        <IconGeneral icon={icon} fill={1} className='text-[var(--brand)] [--icon-size:1.5rem]' />
        <h2 className='font-semibold'>{title}</h2>
      </header>
      {children}
    </div>
  );
}

/** A board's identity: version, serial number and hour meter, grouped under the board name. `extra`
 *  adds one more row — the software version that lives on that board (firmware on the power board,
 *  backend on the control board). */
function BoardCard({
  icon,
  title,
  board,
  extra,
}: {
  icon: string;
  title: string;
  board: BoardInfo;
  extra?: { icon: string; label: string; value: string };
}) {
  return (
    <InfoCard icon={icon} title={title}>
      <dl className='flex flex-col gap-3'>
        {extra && <InfoRow icon={extra.icon} label={extra.label} value={extra.value} />}
        <InfoRow icon='developer_board' label='Versão da Placa' value={board.version} />
        <InfoRow icon='tag' label='Serial Number' value={board.serial} />
        <InfoRow icon='av_timer' label='Horímetro' value={`${board.hours} h`} />
      </dl>
    </InfoCard>
  );
}

/** Informação screen: device versions/serials + Pandewilly logo and a QR code to the repository. */
export function InformacaoScreen() {
  const [d, setD] = useState<DeviceInfo>(DEVICE_INFO);
  const [update, setUpdate] = useState<UpdateStatusDto | null>(null);
  const [applying, setApplying] = useState(false);
  const session = useStore(sessionStore);
  const isAdmin = canAdminister(session?.role ?? "Regular");

  const runUpdate = async () => {
    setApplying(true);
    try {
      await api.applyUpdate();
      showToast("Atualização iniciada. O dispositivo pode reiniciar.");
      const s = await api.getUpdateStatus().catch(() => null);
      if (s) setUpdate(s);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao atualizar.", "error");
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    if (!getToken()) return;
    api
      .getUpdateStatus()
      .then(setUpdate)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api
      .device()
      .then(dto => {
        const power = dto.boards.find(b => b.role === "power");
        const control = dto.boards.find(b => b.role === "control");
        setD({
          storageFreeGB: dto.storageFreeGB,
          storageTotalGB: dto.storageTotalGB,
          firmwareVersion: dto.firmwareVersion,
          htmlVersion: dto.htmlVersion,
          backendVersion: dto.backendVersion,
          boardIp: dto.boardIp,
          os: dto.os,
          power: power ?? DEVICE_INFO.power,
          control: control ?? DEVICE_INFO.control,
        });
      })
      .catch(() => {});
  }, []);

  const freePct = d.storageTotalGB > 0 ? Math.round((d.storageFreeGB / d.storageTotalGB) * 100) : 0;

  return (
    <section className='card flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3'>
        <h1 className='text-2xl font-semibold'>Informação</h1>
        <Link
          href='/'
          aria-label='Fechar'
          className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[var(--hover)]'
        >
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      <div className='flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pr-3 [scrollbar-gutter:stable] lg:flex-row lg:items-start'>
        {/* Logo + repository QR */}
        <div className='flex shrink-0 flex-col items-center gap-3'>
          <Image src='/Logo.svg' alt='PandeWilly' width={112} height={112} priority className='size-28' />
          <div className='rounded-xl bg-white p-3'>
            <QRCodeSVG value={REPO_URL} size={132} />
          </div>
          <span className='text-sm opacity-70'>Repositório</span>
          <Link
            href={REPO_URL}
            target='_blank'
            rel='noreferrer'
            className='max-w-[12rem] text-center text-xs break-all text-[var(--brand)] hover:underline'
          >
            {REPO_URL.replace("https://", "")}
          </Link>
        </div>

        {/* System info + per-board blocks, each in a matching card (top-aligned so nothing is clipped at 1024×600) */}
        <div className='flex min-w-0 flex-1 flex-col gap-4'>
          {update?.updateAvailable === true && (
            <div className='flex flex-col gap-3 rounded-xl border border-[var(--brand)] p-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-center gap-3'>
                <IconGeneral icon='system_update' fill={1} className='shrink-0 text-[var(--brand)] [--icon-size:1.75rem]' />
                <div>
                  <p className='font-semibold'>Atualização disponível</p>
                  <p className='text-sm opacity-70'>
                    Nova versão {update.availableVersion} (atual: {update.currentVersion}).
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button
                  type='button'
                  onClick={runUpdate}
                  disabled={applying}
                  className='btn-action flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-xl px-5 py-2.5 font-semibold disabled:opacity-60 sm:self-auto'
                >
                  <IconGeneral
                    icon={applying ? "progress_activity" : "download"}
                    fill={0}
                    className={`[--icon-size:1.25rem]${applying ? " animate-spin" : ""}`}
                  />
                  {applying ? "Atualizando…" : "Atualizar"}
                </button>
              )}
            </div>
          )}
          <InfoCard icon='dashboard' title='Sistema'>
            <dl className='grid min-w-0 gap-x-8 gap-y-3 sm:grid-cols-2'>
              <InfoRow icon='hard_drive' label='Armazenamento disponível' value={`${d.storageFreeGB} GB de ${d.storageTotalGB} GB (${freePct}%)`} />
              <CpuLoadRow />
              <InfoRow icon='lan' label='IP da Placa' value={d.boardIp} />
              <InfoRow icon='code' label='Versão do HTML' value={d.htmlVersion} />
            </dl>
          </InfoCard>

          {/* One block per board, side by side: each shows Versão / S/N / Horímetro */}
          <div className='grid gap-4 sm:grid-cols-2'>
            <BoardCard
              icon='bolt'
              title='Placa de Potência'
              board={d.power}
              extra={{ icon: "memory", label: "Versão do Firmware", value: d.firmwareVersion }}
            />
            <BoardCard
              icon='developer_board'
              title='Placa de Controle'
              board={d.control}
              extra={{ icon: "dns", label: "Versão do Backend", value: d.backendVersion }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
