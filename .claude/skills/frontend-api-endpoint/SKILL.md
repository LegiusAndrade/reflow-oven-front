---
name: frontend-api-endpoint
description: Procedimento para consumir um endpoint do backend .NET no reflow-oven-front de forma tipada — estender o cliente REST (src/lib/api.ts), validar a resposta com schema Zod, ligar num store (apiStore) e tratar erros como toast (ApiError pt-BR). Use ao integrar uma nova rota REST do backend na UI do reflow-oven-front.
---

# Adicionar/consumir um endpoint do backend no reflow-oven-front

A UI conversa com o backend .NET **só** pelo cliente tipado `src/lib/api.ts` (REST) e por `src/lib/realtime.ts` (SignalR). Nunca faça `fetch` solto numa tela.

## Passos
1. **Leia o contrato.** Confirme método/rota/DTO no backend (`../reflow-oven-backend`, referência Scalar em `/scalar`, ou os DTOs em `Application/Dtos`). Lembre: timestamps chegam **ISO 8601 ou null**; vários **enums são literais pt-BR com acento** (contrato — copie exato).
2. **Schema Zod.** Adicione/estenda o schema da resposta junto dos demais (ex.: `src/lib/apiSchemas.ts`) e um tipo derivado (`z.infer<...>`). Isso valida o que vem do backend e dá o tipo no cliente.
3. **Método em `api.ts`.** Adicione a função tipada (GET/POST/…); reutilize o helper de request existente (base `NEXT_PUBLIC_API_URL`, header Bearer em memória, de-dup de GETs idênticos). Erros já viram `ApiError` com a mensagem pt-BR do ProblemDetails — propague, não engula.
4. **Store (se for estado de tela).** Se a tela usa estado compartilhado, ligue num store via `apiStore.ts` (`createApiStore`), mantendo a superfície `useStore`/snapshot; mutações chamam a API e, no erro, mostram **toast**.
5. **Limites.** Qualquer entrada que vá no payload respeita os tetos de `src/lib/limits.ts` (sem número mágico).
6. **Verifique.** `yarn lint`; se possível, um teste Vitest do schema (`src/**/*.test.ts`) e uma checagem visual (skill `frontend-verify`).

## Lembrar
- Mantenha **`limits.ts` em sincronia com o `DomainConstants` do backend** — é fonte única de verdade compartilhada.
- Auth é por cookie httpOnly (BFF em `app/api/auth/`); o cliente segura o token em memória (hidratado de `ws-token`).
- Texto pt-BR na UI; código/identificadores/commits em inglês.
