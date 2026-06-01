"use client";

import { clsx } from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BottomBar from "@/components/BottomBar";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/Toaster";
import TopBar from "@/components/TopBar";
import { VirtualKeyboard } from "@/components/VirtualKeyboard";
import { useHydrated } from "@/hooks/useHydrated";
import { useLiveReadings } from "@/hooks/useLiveReadings";
import { useSession } from "@/hooks/useSession";
import { useStore } from "@/hooks/useStore";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { canAccess, refreshSession } from "@/lib/auth";
import { APP_BOOT_TIMEOUT_MS } from "@/lib/limits";
import { logger } from "@/lib/logger";
import { notificationsStore, refreshNotifications, startNotificationsPolling, unreadCount } from "@/lib/notifications";
import { preferencesStore } from "@/lib/preferences";
import { DEFAULT_RUN_SERIES } from "@/lib/run";
import { MOCK_READINGS } from "@/lib/sensors";
import { applyTheme } from "@/lib/theme";

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
  const unread = unreadCount(useStore(notificationsStore));
  const sys = useSystemStatus(Boolean(session));

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

  // Re-validate the stored JWT against the API once hydrated (clears the session if expired).
  useEffect(() => {
    if (hydrated) void refreshSession();
  }, [hydrated]);

  // Apply the per-user theme + seed the prefs store from the session — keyed on the session itself so
  // it re-runs on every transition: boot-from-cache, the refreshSession result, AND a fresh login
  // (router.replace keeps this shell mounted, so a [hydrated]-only effect would miss the login and the
  // new user would keep the previous defaults until a manual reload). Imperative applyTheme (not
  // setState) avoids react-hooks/set-state-in-effect and a dark<->light flash; seeding from the session
  // means no redundant GET /api/me/preferences. Logout (session→null) resets both to the defaults.
  useEffect(() => {
    if (!hydrated) return;
    const theme = session?.theme ?? "system";
    applyTheme(theme);
    preferencesStore.seed({ theme, chartSeries: session?.chartSeries ?? DEFAULT_RUN_SERIES });
    // While following the OS ("system"), re-apply on dark/light changes so the palette — and the
    // toggle icon, via the store re-seed (new ref → re-render, current chartSeries preserved) —
    // track the OS without a reload.
    if (theme !== "system" || typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
      preferencesStore.seed({ ...preferencesStore.get() });
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [hydrated, session]);

  // Console trail of navigation (see src/lib/logger.ts).
  useEffect(() => {
    logger.info("route", pathname);
  }, [pathname]);

  // Poll the notifications feed while signed in (never on /login). Stops on logout/unmount.
  useEffect(() => {
    if (!session) return;
    return startNotificationsPolling();
  }, [session]);

  // Also refresh the feed on every navigation while signed in.
  useEffect(() => {
    if (!session) return;
    void refreshNotifications();
  }, [session, pathname]);

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

  // Don't spin forever: if the boot stays blocked (e.g. the backend is unreachable while we
  // validate the session), surface a connection error with a retry once the timeout elapses.
  const [bootTimedOut, setBootTimedOut] = useState(false);
  useEffect(() => {
    if (!blocked) return;
    const id = window.setTimeout(() => setBootTimedOut(true), APP_BOOT_TIMEOUT_MS);
    // Reset on cleanup (i.e. when `blocked` clears) — avoids a synchronous setState in the effect body.
    return () => {
      window.clearTimeout(id);
      setBootTimedOut(false);
    };
  }, [blocked]);

  if (blocked) {
    if (bootTimedOut) {
      return (
        <div className='text-fg grid h-screen place-items-center p-6'>
          <div className='card flex w-[min(92vw,28rem)] flex-col items-center gap-4 rounded-2xl border border-[var(--border)] p-6 text-center'>
            <IconGeneral icon='cloud_off' fill={1} className='shrink-0 text-red-700 dark:text-red-400 [--icon-size:2.5rem]' />
            <h1 className='text-xl font-semibold'>Não foi possível conectar ao servidor</h1>
            <p className='opacity-70'>Verifique se o servidor está ligado e a rede conectada, depois tente novamente.</p>
            <button
              type='button'
              onClick={() => window.location.reload()}
              className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'
            >
              <IconGeneral icon='refresh' fill={0} className='[--icon-size:1.25rem]' />
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className='text-fg grid h-screen place-items-center'>
        <IconGeneral icon='progress_activity' fill={0} className='animate-spin opacity-60 [--icon-size:2.5rem]' />
      </div>
    );
  }

  return (
    <div className='text-fg flex h-screen flex-col overflow-hidden'>
      <TopBar
        statusNotification={{ amount: unread, status: unread > 0 ? "ACTIVE" : "NONE" }}
        connectedServer={sys.centralOnline}
        network={{ link: sys.link, connected: sys.connected, signalPercent: sys.signalPercent }}
        user={session}
      />

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

      <VirtualKeyboard />

      {/* Forced change: a user still on the system-issued provisional password must set a new one
          before doing anything else. Non-dismissable (forced) and cleared once refreshSession()
          returns a session with mustChangePassword no longer set. */}
      <ChangePasswordModal open={Boolean(session?.mustChangePassword)} onClose={() => {}} forced />
    </div>
  );
}
