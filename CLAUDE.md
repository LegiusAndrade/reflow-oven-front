# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Touchscreen frontend for a **reflow oven** used to solder SMD components onto PCBs. Built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4**. It runs on a Raspberry Pi / Orange Pi. Data and live telemetry come from the **.NET backend** (`../reflow-oven-backend`) over **REST + SignalR**; that backend is what talks to the STM32 power board over **RS422**.

The UI is responsible for:
- Creating/editing temperature profiles (temperature × time)
- Real-time display of sensor readings from the power board (grill thermocouple type-K, NTC heatsink temp, output current via Hall sensor, input 127VAC / output 0–180VDC voltages, fan RPMs)
- Fault/alert display; closed-loop PID control is planned.

Active development happens on the **`develop`** branch (ahead of `master`). Shared UI components live under `src/components/` (`TopBar`, `Sidebar`, `LinkButton`, and `Icon/*`); the screens (e.g. the Initial/monitoring page) are built from these. UI text and metadata are in **Portuguese (pt-BR)**.

## Backend integration

The UI talks to the .NET backend (`../reflow-oven-backend`) — the former `localStorage` mock is gone.

- **`src/lib/api.ts`** — typed REST client. Base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:5248`); the JWT is held in a client-only **in-memory** var (the server reads the httpOnly cookie instead — see Auth) and concurrent identical GETs are de-duplicated; throws `ApiError` carrying the backend's pt-BR ProblemDetails message. Covers every endpoint.
- **`src/lib/realtime.ts`** — SignalR clients for `/hubs/telemetry` (live run trace) and `/hubs/diagnostics` (1 Hz sensor readings); the token is sent via `accessTokenFactory` (async, falling back to `ws-token`).
- **Auth (BFF + httpOnly cookie)** — login/logout/`ws-token` are Next Route Handlers under `app/api/auth/` that set/clear an `httpOnly` `reflow_token` cookie; the backend stays a plain **Bearer** API. `src/middleware.ts` guards routes by the cookie, and the server reads it per-request via `src/lib/serverAuth.ts` (`getServerToken`) — this is what enables SSR. The client keeps the token in memory, hydrated from `ws-token`. `src/lib/auth.ts` keeps `login`/`logout`/`refreshSession` + the role gates (`canAccess`); `AppShell` bootstraps the token (`bootDone`) and validates on load.
- **Stores** — `programStore`, `usersStore` and `settingsStore` (via `apiStore.ts`'s `createApiStore`) are API-backed but keep the `useStore`/snapshot surface, so screens are largely unchanged; `reportsClient.ts` feeds the Relatórios tables/overlays. Mutations call the API and surface errors as toasts.
- **Run** — `RunModal` starts/stops a run via REST and streams its trace over SignalR; `useLiveReadings` feeds the BottomBar from the diagnostics hub.
- Set `NEXT_PUBLIC_API_URL` in `.env.local` (see `.env.example`). **The backend must be running** (`dotnet run` + PostgreSQL) for the app to work; seeded dev login `lucas.silva` / `reflow1234`.

## Commands

```bash
yarn dev        # dev server (Turbopack — default bundler in Next 16)
yarn build      # production build (Turbopack)
yarn start      # serve production build
yarn lint       # ESLint
```

This project uses **Yarn** (Classic v1 — `yarn.lock`). Use `yarn` / `yarn add`, not `npm`.

No test runner is configured yet.

## Conventions

Linting/formatting are enforced; ESLint and Prettier now agree (Prettier `singleQuote: false`):
- **Double quotes** in `.ts`/`.tsx` JS strings (`quotes: ["error", "double"]`); single quotes in JSX attributes (`jsxSingleQuote: true` — not governed by the ESLint `quotes` rule).
- Semicolons always required; 2-space indent; 150-char print width; ES5 trailing commas.
- Prefer arrow callbacks and template literals.
- Unused vars are warnings; prefix intentionally-unused names with `_` to silence them.

Use the `@/*` path alias for imports from `src/` (e.g. `@/app/...`).

The **Nunito** font is wired up via `next/font` in `src/app/layout.tsx` and exposed as the `--font-nunito` CSS variable. Icons use the **Material Symbols Rounded** webfont (loaded via `<link>` in `layout.tsx`), rendered through the `IconGeneral` component (sets `font-variation-settings` and reads the `--icon-size` CSS variable). Class composition uses **`clsx`**. Color tokens / theme live in `src/app/globals.css`.

### UI & styling

- Style with the **semantic utility classes** in `globals.css` (`.card`, `.top-bar`, `.bottom-bar`, `.sidebar`, `.btn-action`, `.btn-link`) instead of raw color tokens.
- **Every interactive button gets a hover + press animation** — don't ship a static button. `.btn-action` and `.btn-link` already include it; for icon/compact buttons add the **`.btn-press`** utility (scales up on hover, down on `:active`). The persistent menu chrome (`AppShell`: TopBar/BottomBar/drawer) is shared across all routes.
- **Size fluidly, not with fixed px.** The type scale is fluid+capped via `clamp()` in the `@theme` block (`text-sm`…`text-2xl`). For layout prefer content/relative sizing or `clamp()`, so it adapts from the **1024×600** touchscreen baseline up to larger screens (there is no zoom wrapper).
- **Scroll gutter:** a vertical scroll area (`overflow-y-auto`) must (1) reserve the scrollbar lane and (2) keep a visible gap between content and the bar. Use **`[scrollbar-gutter:stable]` + `pr-3`** (forms/cards) — the gutter reserves the lane (no overlap / no layout shift) and the `pr-3` adds the breathing room (without it the content butts right against the bar and reads as "on the line"). For a **rounded, bordered scroll box** (e.g. tables) use the shared **`TableScrollBox`** (never put `overflow-auto` directly on the rounded+border element): border+radius on an `overflow-hidden` outer with **`pr-2`**, and `overflow-auto` + `pr-3` + `scrollbar-gutter:stable` on the inner child. The outer `pr-2` insets the scroller so the bar floats a few px **inside** the border instead of sitting on the border line — Firefox uses overlay bars that ignore `scrollbar-gutter` (reserve 0) and paint at the scroller's right edge, so without the inset the bar lands on the border. Scrollbars don't render in headless screenshots (overlay, 0 width; `::-webkit-scrollbar` CSS won't force a classic one) — verify by DOM measurement (`offsetWidth − clientWidth` ≈ 15px reserved) or by launching Chromium with `--disable-features=OverlayScrollbar` to force a visible classic bar.

### Limits

Anything the user can type or grow **must have an explicit limit** — a max length for text, `min`/`max` for numeric fields, and a max count for lists (profile points, table rows, items). Never ship an unbounded input or list.

Keep every cap in **`src/lib/limits.ts`** as a named constant (C-style `#define`, e.g. `PROGRAM_NAME_MAX_LENGTH`, `PROFILE_MAX_POINTS`, `POINT_TEMP_MAX`). Import the constant at the call site — never hard-code a magic number — so a limit can be tuned in one place.

### Git / commits

- **Commit messages are ALWAYS written in English** — subject *and* body — even though the app's UI text (and this conversation) are in Portuguese (pt-BR). Use conventional-commit prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). Example: `feat: add system log modal to the Diagnostico tab`.
- Do **not** add a `Co-Authored-By` (or any authorship) trailer — commits are authored by the repo owner.
- Never `git commit` or `git push` without the user's explicit request. Active branch is **`develop`**.

## Reference

`docs/` holds the project design (`Esboço projeto.drawio`) and setup guides in `docs/MD_files/` (ESLint, Prettier, EditorConfig, VS Code).
