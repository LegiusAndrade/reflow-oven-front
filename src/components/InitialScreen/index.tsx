"use client";

import { clsx } from "clsx";
import { useState } from "react";
import BottomBar from "@/components/BottomBar";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Sidebar } from "@/components/Sidebar";
import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import TopBar from "@/components/TopBar";
import type { Program } from "@/lib/programs";
import type { SensorReadings } from "@/lib/sensors";

export interface IInitialScreenProps {
  programs: Program[];
  readings: SensorReadings;
}

/**
 * Initial / monitoring screen (Figma "Initial Page"): a program carousel in the
 * center, the persistent sensor BottomBar, and the navigation Sidebar as a
 * slide-out drawer opened from the BottomBar hamburger.
 */
export default function InitialScreen({ programs, readings }: IInitialScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const count = programs.length;
  const program = programs[index];
  const go = (delta: number) => setIndex((i) => (count === 0 ? 0 : (i + delta + count) % count));

  return (
    <div className='text-fg relative flex h-full flex-col overflow-hidden'>
      <TopBar
        status='Aguardando Iniciar Processo...'
        statusNotification={{ amount: 3, status: "ACTIVE" }}
        connectedServer={true}
        signalWifi={{ signal: "OFF" }}
      />

      {/* Content region between the bars; also bounds the menu drawer so it stops
          at the bottom-bar line instead of covering it. */}
      <div className='relative min-h-0 flex-1'>
        <main className='flex h-full flex-col items-center justify-center gap-5 px-6 py-6'>
          {/* Carousel: prev/next arrows around the program preview */}
          <div className='flex w-full max-w-[940px] flex-1 items-center gap-3'>
            <CarouselArrow direction='prev' disabled={count <= 1} onClick={() => go(-1)} />
            <div className='card h-full flex-1 overflow-hidden rounded-xl p-3'>
              {program ? (
                <TemperatureProfileChart points={program.profile} className='h-full w-full' />
              ) : (
                <div className='grid h-full place-items-center opacity-40'>Nenhum programa</div>
              )}
            </div>
            <CarouselArrow direction='next' disabled={count <= 1} onClick={() => go(1)} />
          </div>

          {/* Actions: start button + current program info */}
          <div className='flex w-full max-w-[940px] items-center justify-between gap-4'>
            <button type='button' className='btn-action cursor-pointer px-5 py-3 text-base font-semibold sm:text-lg'>
              INICIAR PROGRAMA
            </button>

            {program && (
              <div className='flex min-w-0 flex-col items-end text-right'>
                <span className='truncate text-lg font-semibold sm:text-xl'>{program.name}</span>
                <span className='text-sm opacity-80 sm:text-base'>
                  {`Execuções: ${program.runCount} vezes | Último uso: ${program.lastUsed}`}
                </span>
              </div>
            )}
          </div>
        </main>

        {/* Backdrop (dims only the content region, not the bars) */}
        <div
          aria-hidden='true'
          onClick={() => setDrawerOpen(false)}
          className={clsx(
            "absolute inset-0 z-40 bg-black/50 transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />

        {/* Slide-out navigation drawer — width adapts to the Sidebar content (no fixed
            size), height spans the content region down to the bottom-bar line. */}
        <div
          role='dialog'
          aria-modal='true'
          aria-label='Menu de navegação'
          className={clsx(
            "absolute inset-y-0 left-0 z-50 w-fit transition-transform duration-300",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar />
        </div>
      </div>

      <BottomBar readings={readings} menuOpen={drawerOpen} onMenuClick={() => setDrawerOpen((o) => !o)} />
    </div>
  );
}

interface ICarouselArrowProps {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
}

function CarouselArrow({ direction, onClick, disabled }: ICarouselArrowProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Programa anterior" : "Próximo programa"}
      className='grid size-14 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent xl:size-16'
    >
      {/* Always render chevron_left (perfectly centered) and mirror it for "next",
          so both arrows share identical glyph metrics. */}
      <IconGeneral
        icon='chevron_left'
        fill={0}
        className={clsx("[--icon-size:40px] xl:[--icon-size:48px]", direction === "next" && "-scale-x-100")}
      />
    </button>
  );
}
