"use client";

import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { api, getToken } from "@/lib/api";
import { DEVICE_INFO, REPO_URL, type BoardInfo, type DeviceInfo } from "@/lib/deviceInfo";
import { showToast } from "@/lib/toast";

/** Simulated "latest available" HTML version (there is no update server yet). */
const SIMULATED_NEW_VERSION = "1.4.0";

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

/** A board's identity: version, serial number and hour meter, grouped under the board name. */
function BoardCard({ icon, title, board }: { icon: string; title: string; board: BoardInfo }) {
  return (
    <InfoCard icon={icon} title={title}>
      <dl className='flex flex-col gap-3'>
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
  const [updateState, setUpdateState] = useState<"available" | "updating" | "done">("available");

  const runUpdate = () => {
    setUpdateState("updating");
    // Simulated update (placeholder): a real one would trigger the backend/OTA flow.
    window.setTimeout(() => {
      setUpdateState("done");
      showToast("Atualização concluída. Reinicie o dispositivo para aplicar.");
    }, 2500);
  };

  useEffect(() => {
    if (!getToken()) return;
    api
      .device()
      .then((dto) => {
        const power = dto.boards.find((b) => b.role === "power");
        const control = dto.boards.find((b) => b.role === "control");
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
        <Link href='/' aria-label='Fechar' className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[var(--hover)]'>
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
          <Link href={REPO_URL} target='_blank' rel='noreferrer' className='max-w-[12rem] text-center text-xs break-all text-[var(--brand)] hover:underline'>
            {REPO_URL.replace("https://", "")}
          </Link>
        </div>

        {/* System info + per-board blocks, each in a matching card (top-aligned so nothing is clipped at 1024×600) */}
        <div className='flex min-w-0 flex-1 flex-col gap-4'>
          {updateState !== "done" && (
            <div className='flex flex-col gap-3 rounded-xl border border-[var(--brand)] p-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-center gap-3'>
                <IconGeneral icon='system_update' fill={1} className='shrink-0 text-[var(--brand)] [--icon-size:1.75rem]' />
                <div>
                  <p className='font-semibold'>Atualização disponível</p>
                  <p className='text-sm opacity-70'>
                    Nova versão {SIMULATED_NEW_VERSION} (atual: {d.htmlVersion}).
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={runUpdate}
                disabled={updateState === "updating"}
                className='btn-action flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-xl px-5 py-2.5 font-semibold disabled:opacity-60 sm:self-auto'
              >
                <IconGeneral icon={updateState === "updating" ? "progress_activity" : "download"} fill={0} className={`[--icon-size:1.25rem]${updateState === "updating" ? " animate-spin" : ""}`} />
                {updateState === "updating" ? "Atualizando…" : "Atualizar"}
              </button>
            </div>
          )}
          <InfoCard icon='dashboard' title='Sistema'>
            <dl className='grid min-w-0 gap-x-8 gap-y-3 sm:grid-cols-2'>
              <InfoRow icon='hard_drive' label='Armazenamento disponível' value={`${d.storageFreeGB} GB de ${d.storageTotalGB} GB (${freePct}%)`} />
              <InfoRow icon='lan' label='IP da Placa' value={d.boardIp} />
              <InfoRow icon='memory' label='Versão do Firmware' value={d.firmwareVersion} />
              <InfoRow icon='code' label='Versão do HTML' value={d.htmlVersion} />
              <InfoRow icon='dns' label='Versão do Backend' value={d.backendVersion} />
            </dl>
          </InfoCard>

          {/* One block per board, side by side: each shows Versão / S/N / Horímetro */}
          <div className='grid gap-4 sm:grid-cols-2'>
            <BoardCard icon='bolt' title='Placa de Potência' board={d.power} />
            <BoardCard icon='developer_board' title='Placa de Controle' board={d.control} />
          </div>
        </div>
      </div>
    </section>
  );
}
