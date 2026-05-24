"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import BottomBar from "@/components/BottomBar";
import { ProgramGallery } from "@/components/ProgramGallery";
import { Sidebar } from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useLiveReadings } from "@/hooks/useLiveReadings";
import type { Program } from "@/lib/programs";
import type { SensorReadings } from "@/lib/sensors";

export interface IInitialScreenProps {
  programs: Program[];
  readings: SensorReadings;
}

/**
 * Initial / monitoring screen: a responsive, paginated gallery of program cards (fits as
 * many as the viewport allows, arrows for the rest), the persistent sensor BottomBar, and
 * the navigation Sidebar as a slide-out drawer. The type scale is fluid (see globals.css).
 */
export default function InitialScreen({ programs, readings }: IInitialScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const liveReadings = useLiveReadings(readings);
  const drawerRef = useRef<HTMLDivElement>(null);

  // While open: close on Esc, move focus into the drawer, and restore focus on close.
  useEffect(() => {
    if (!drawerOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [drawerOpen]);

  return (
    <div className='text-fg flex h-screen flex-col overflow-hidden'>
      <TopBar
        status='Aguardando Iniciar Processo...'
        statusNotification={{ amount: 3, status: "ACTIVE" }}
        connectedServer={true}
        signalWifi={{ signal: "OFF" }}
      />

      {/* Content region between the bars; also bounds the menu drawer. */}
      <div className='relative min-h-0 flex-1'>
        <main className='h-full overflow-hidden p-[clamp(0.75rem,2vw,2rem)]'>
          <ProgramGallery programs={programs} />
        </main>

        {/* Backdrop */}
        <div
          aria-hidden='true'
          onClick={() => setDrawerOpen(false)}
          className={clsx(
            "absolute inset-0 z-40 bg-black/50 transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />

        {/* Slide-out navigation drawer */}
        <div
          ref={drawerRef}
          role='dialog'
          aria-modal='true'
          aria-label='Menu de navegação'
          inert={!drawerOpen}
          className={clsx(
            "absolute inset-y-0 left-0 z-50 w-fit transition-transform duration-300",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar />
        </div>
      </div>

      <BottomBar readings={liveReadings} menuOpen={drawerOpen} onMenuClick={() => setDrawerOpen((o) => !o)} />
    </div>
  );
}
