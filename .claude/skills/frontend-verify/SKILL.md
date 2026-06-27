---
name: frontend-verify
description: Verificação visual/smoke de telas do reflow-oven-front com Playwright no baseline touchscreen 1024×600 — tira screenshot e captura erros de console/página contra um `yarn dev` rodando. Use ao validar uma tela após mudança de UI, reproduzir um problema visual, ou checar erros de runtime no navegador do reflow-oven-front.
---

# Verificação visual do reflow-oven-front (Playwright 1024×600)

O front tem dezenas de scripts `*.mjs` na raiz (`shoot*.mjs`) que são verificações Playwright **ad-hoc** — não fazem parte do `yarn test`. Cada um sobe Chromium headless no viewport **1024×600** (a base do touchscreen), navega numa tela contra o dev server, captura erros de console/página e salva screenshot(s) em `/tmp`.

## Pré-requisitos
1. **Backend no ar** (a UI depende dele): ver `reflow-oven-backend` — PostgreSQL + `dotnet run`, porta `5248`.
2. **Dev server:** `yarn dev` (http://localhost:3000).
3. `playwright` já é devDependency do projeto (não precisa instalar à parte).

## Rodar um script existente
```bash
node shootsmoke.mjs        # exemplo de smoke; veja os outros shoot*.mjs como referência de navegação/login
```
Login do seed do backend: `lucas.silva` / `reflow1234` (ou o técnico `calibracao` / `calibra`).

## Template para uma nova checagem
Crie `shoot<algo>.mjs` na raiz do front seguindo o padrão dos existentes:
```js
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });
page.setDefaultTimeout(7000);

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${String(e.message).slice(0, 120)}`));

// ... navegue / faça login / abra a tela alvo ...
await page.goto(`${BASE}/`);
await page.screenshot({ path: `${OUT}/check.png` });

console.log(errors.length ? errors : "sem erros de console");
await browser.close();
```

## Cuidado com scrollbars
**Scrollbars não aparecem em screenshot headless** (overlay, largura 0; o CSS `::-webkit-scrollbar` não força a clássica). Para verificar a reserva da pista de scroll, **meça o DOM** (`offsetWidth − clientWidth` ≈ 15px) ou suba o Chromium com `--disable-features=OverlayScrollbar` para forçar uma barra clássica visível.

## Observação
Esses scripts são **descartáveis** (verificação pontual), não uma suíte mantida. Para lógica, escreva teste Vitest (`src/**/*.test.ts`).
