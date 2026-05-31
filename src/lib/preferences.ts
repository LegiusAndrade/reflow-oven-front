/**
 * Per-user preferences (theme + execution-chart series): the single source of truth for both,
 * backed by /api/me/preferences. Any authenticated user (Admin AND Regular) can persist these.
 *
 * PUT is full-replace, so every save sends the COMPLETE object ({ theme, chartSeries }). The
 * technician/calibration session gets a 403 — there prefs are not persistable and stay in-session
 * only (we swallow/log the 403 instead of toasting on every change).
 *
 * Hand-rolled (rather than createApiStore) so we can `seed()` from the already-fetched session
 * without an extra GET or a stray PUT — avoiding a redundant fetch and a theme/chart flash on load.
 */

import { api, ApiError } from "./api";
import type { Theme, RunSeriesDto, UserPreferencesDto } from "./api";
import { sessionStore } from "./auth";
import type { JsonStore } from "./localStore";
import { DEFAULT_RUN_SERIES } from "./run";
import { applyTheme } from "./theme";
import { showToast } from "./toast";
import { logger } from "./logger";

export type { Theme, RunSeriesDto, UserPreferencesDto };

export const DEFAULT_PREFERENCES: UserPreferencesDto = {
  theme: "system",
  chartSeries: DEFAULT_RUN_SERIES,
};

interface PreferencesStore extends JsonStore<UserPreferencesDto> {
  /** Prime the value from an already-fetched source (e.g. the session) without a fetch or a PUT. */
  seed: (_value: UserPreferencesDto) => void;
}

function createPreferencesStore(): PreferencesStore {
  // Seed synchronously from the cached session (written at the last login) so the common path needs
  // no GET and a child component that subscribes before AppShell's seed effect can't trigger a
  // redundant fetch — React runs child effects (ThemeToggle/RunModal/GeralTab) BEFORE the parent's.
  // SSR-safe: sessionStore.get() returns null without a window.
  const cached = sessionStore.get();
  let value: UserPreferencesDto = cached
    ? { theme: cached.theme ?? "system", chartSeries: cached.chartSeries ?? DEFAULT_RUN_SERIES }
    : DEFAULT_PREFERENCES;
  let loaded = Boolean(cached);
  let loading = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const ensureLoaded = () => {
    if (typeof window === "undefined" || loaded || loading) return;
    loading = true;
    api
      .getPreferences()
      .then((v) => {
        // A seed()/set() (login, optimistic write) may have taken ownership while this GET was in
        // flight — a stale response must not clobber it (lost-update / revert-on-mount).
        if (loaded) return;
        value = v;
        loaded = true;
        notify();
      })
      .catch((err) => {
        // 403 = technician session: prefs aren't persistable, keep the fallback in-session.
        if (!(err instanceof ApiError && err.status === 403)) {
          // Leave `loaded` false so a later subscribe retries once the backend is reachable.
          return;
        }
        loaded = true;
      })
      .finally(() => {
        loading = false;
      });
  };

  return {
    get: () => value,
    getServerSnapshot: () => DEFAULT_PREFERENCES,
    set: (v) => {
      value = v;
      loaded = true; // an explicit write owns the value — a late initial GET must not revert it
      notify();
    },
    update: (fn) => {
      value = fn(value);
      loaded = true;
      notify();
    },
    subscribe: (cb) => {
      listeners.add(cb);
      ensureLoaded();
      return () => void listeners.delete(cb);
    },
    seed: (v) => {
      value = v;
      loaded = true;
      notify();
    },
  };
}

export const preferencesStore = createPreferencesStore();

// Monotonic write counter so a slow/failed PUT can't clobber a newer one. Rapid toggles on the
// touchscreen overlap: each persist() snapshots `prev` at call time (the previous optimistic value),
// so an unconditional rollback would resurrect a stale value over a later write. We roll back only if
// this is still the latest write (mirrors programStore.requestSeq). If the latest write itself fails
// it rolls back correctly; the only residue is two back-to-back failures, healed on the next refresh.
let writeSeq = 0;

/** Persist the FULL object (PUT is full-replace). Optimistic: the store value updates immediately;
 *  on a non-403 failure we roll back and toast. A 403 (technician) is swallowed — in-session only. */
async function persist(prev: UserPreferencesDto, next: UserPreferencesDto): Promise<void> {
  const seq = ++writeSeq;
  preferencesStore.set(next);
  try {
    await api.updatePreferences(next);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      logger.info("preferences", "sessão técnica: preferências mantidas apenas na sessão");
      return; // keep the in-session value, don't surface an error
    }
    if (seq !== writeSeq) return; // a newer write supersedes this one — don't clobber it on rollback
    preferencesStore.set(prev);
    applyTheme(prev.theme); // re-sync the DOM with the rolled-back theme
    showToast("Falha ao salvar. As alterações foram revertidas.", "error");
  }
}

export function setTheme(theme: Theme): Promise<void> {
  const prev = preferencesStore.get();
  applyTheme(theme); // optimistic: reflect the new theme immediately
  return persist(prev, { theme, chartSeries: prev.chartSeries });
}

export function setChartSeries(series: RunSeriesDto): Promise<void> {
  const prev = preferencesStore.get();
  return persist(prev, { theme: prev.theme, chartSeries: series });
}
