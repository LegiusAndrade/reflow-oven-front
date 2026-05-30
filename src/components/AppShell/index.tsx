"use client";

import { clsx } from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BottomBar from "@/components/BottomBar";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/Toaster";
import TopBar from "@/components/TopBar";
import { useHydrated } from "@/hooks/useHydrated";
import { useLiveReadings } from "@/hooks/useLiveReadings";
import { useSession } from "@/hooks/useSession";
import { canAccess } from "@/lib/auth";
import { MOCK_READINGS } from "@/lib/sensors";

export interface IAppShellProps {
  children: React.ReactNode;
  /** TopBar status text. */
  status?: string;
}

/**
 * Shared chrome for every screen: TopBar, the live-sensor BottomBar, and the navigation
 * Sidebar as a slide-out drawer (Esc/focus/inert handled here). Screens provide their
 * main content as `children`.
 */
export function AppShell({ children }: IAppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const liveReadings = useLiveReadings(MOCK_READINGS);
  const drawerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSession();

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

  // Auth guard (deferred until hydrated so the persisted session loads): /login is always
  // reachable; every other route needs a session and an allowed role.
  const isLogin = pathname === "/login";
  useEffect(() => {
    if (!hydrated) return;
    if (isLogin) {
      if (session) router.replace("/");
      return;
    }
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canAccess(session.role, pathname)) router.replace("/");
  }, [hydrated, isLogin, session, pathname, router]);

  const blocked = !hydrated || (isLogin ? Boolean(session) : !session ? true : !canAccess(session.role, pathname));
  if (blocked) {
    return (
      <div className='text-fg grid h-screen place-items-center'>
        <IconGeneral icon='progress_activity' fill={0} className='animate-spin opacity-60 [--icon-size:2.5rem]' />
      </div>
    );
  }

  return (
    <div className='text-fg flex h-screen flex-col overflow-hidden'>
      <TopBar statusNotification={{ amount: 3, status: "ACTIVE" }} connectedServer={true} signalWifi={{ signal: "OFF" }} user={session} />

      {/* Content region between the bars. On xl+ the sidebar is docked (always open); below
          xl it bounds the slide-out drawer. */}
      <div className='relative flex min-h-0 flex-1'>
        {/* Docked sidebar (dock breakpoint): full height, flush against the top/bottom bars.
            Only when logged in — the login screen has no nav. */}
        {session && (
          <aside className='hidden h-full shrink-0 dock:block'>
            <Sidebar />
          </aside>
        )}

        <main className='h-full flex-1 overflow-hidden p-[clamp(0.75rem,2vw,2rem)]'>{children}</main>

        {/* Drawer + backdrop (below the dock breakpoint), only when logged in */}
        {session && (
          <>
            <div
              aria-hidden='true'
              onClick={() => setDrawerOpen(false)}
              className={clsx(
                "absolute inset-0 z-40 bg-black/50 transition-opacity duration-300 dock:hidden",
                drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            />
            <div
              ref={drawerRef}
              role='dialog'
              aria-modal='true'
              aria-label='Menu de navegação'
              inert={!drawerOpen}
              className={clsx(
                "absolute inset-y-0 left-0 z-50 w-fit transition-transform duration-300 dock:hidden",
                drawerOpen ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <Sidebar className='rounded-xl' />
            </div>
          </>
        )}

        <Toaster />
      </div>

      <BottomBar readings={liveReadings} menuOpen={drawerOpen} onMenuClick={() => setDrawerOpen((o) => !o)} showMenu={Boolean(session)} />
    </div>
  );
}
