# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Touchscreen frontend for a **reflow oven** used to solder SMD components onto PCBs. Built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4**. It runs on a Raspberry Pi / Orange Pi and communicates over **RS422** with an STM32-based power board.

The UI is responsible for:
- Creating/editing temperature profiles (temperature × time)
- Real-time display of sensor readings from the power board (grill thermocouple type-K, NTC heatsink temp, output current via Hall sensor, input 127VAC / output 0–180VDC voltages, fan RPMs)
- Fault/alert display; closed-loop PID control is planned.

Active development happens on the **`develop`** branch (ahead of `master`). Shared UI components live under `src/components/` (`TopBar`, `Sidebar`, `LinkButton`, and `Icon/*`); the screens (e.g. the Initial/monitoring page) are built from these. UI text and metadata are in **Portuguese (pt-BR)**.

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

## Reference

`docs/` holds the project design (`Esboço projeto.drawio`) and setup guides in `docs/MD_files/` (ESLint, Prettier, EditorConfig, VS Code).
