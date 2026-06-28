# TODO — Frontend (reflow-oven)

Roadmap **em aberto**. O histórico do que já foi feito está em `DONE.md`. Tarefas que dependem do backend
vão para `../reflow-oven-backend/TODO.md` (o front consome quando chegar). Notas técnicas pontuais no código
usam o marcador `TODO(backend)` (`grep -rn "TODO(backend)" src/`).

> ✅ **ENTREGUE** (`54183a1`, 2026-06-27) — virou a aba **Autotune** em Configurações (sessão técnica / `CalibrationOnly`, ao lado de Calibração): disparar/cancelar, progresso ao vivo (~1 Hz), histórico paginado e aplicar/descartar com confirmação. Arquivada no `DONE.md`; a spec abaixo fica como referência.

## Autotune do PID — tela nova (backend pronto, 2026-06-17)

Backend novo: **auto-tune do PID por relé** na placa (RS422), com **histórico persistido**. Falta a tela dedicada.

- **Disparar / cancelar.** `POST /api/autotune/start` com `{ targetTemp }` (°C de oscilação) e
  `POST /api/autotune/cancel`. São **CalibrationOnly** (técnico de calibração — login `calibracao`/`calibra`),
  junto das telas de Calibração.
- **Progresso ao vivo.** `GET /api/autotune/status` (poll ~1 Hz) → `{ running, current }`; `current` é o
  `AutotuneRunDto` (status `Executando`, `cycles` subindo). Ocioso → devolve o último tune (pro aviso "aplicar?").
- **Histórico.** `GET /api/autotune/history?page=&pageSize=` → `{ total, page, pageSize, items[] }`. `total` =
  "quantas vezes foi feito". Tabela com: início/fim, duração, **status**, **alvo**, **ciclos**, **Ku/Tu**,
  **Kp/Ki/Kd** sugeridos, ganhos **anteriores** (antes→depois), **aplicado?**, e na falha o **motivo** + o
  **código E-1xx** da placa, e **quem** disparou (`triggeredBy`).
- **Aplicar com confirmação (decisão do Lucas).** Os ganhos **não** entram sozinhos: num tune `Concluído`,
  mostrar Kp/Ki/Kd sugeridos (com o antes→depois) e **Aplicar** → `POST /api/autotune/{id}/apply` (grava em
  Configurações + empurra pra placa) ou **Descartar** → `POST /api/autotune/{id}/dismiss`. Os campos
  `applied`/`dismissed` tiram o aviso pendente.
- Status do tune no wire: `Executando` / `Concluído` / `Falha` / `Cancelado`.

## Backend (registrado lá; o front já está pronto ou contornado)

- [x] **#13 — Regular leva 403 ao iniciar programa** — ✅ **backend já libera** (2026-06-04): `/api/runs/start`+`/stop`
  usam a policy `OperatorOrAdmin` (inclui Regular). Verificado ao vivo: `vanessa` (Regular) → **HTTP 200**. Se ainda
  der 403 no device, é token antigo/build velho — re-logar.
- [~] **#14 — criação de usuário** — (a) ✅ **backend correto** (2026-06-04): MODELO B — gera a senha, envia por
  e-mail e o **login com ela funciona** (verificado ao vivo). Decidido (Lucas, 04/06): **manter MODELO B**. →
  **Front:** ao criar, mostrar "senha enviada por e-mail" e **não** coletar/esperar senha do admin; em dev a senha
  provisória sai no console da API (`[stub-email] … senha 'XXXX'`). (b) o "usuário já existe" antes de o modal
  fechar é **front**.
- [x] **#11 — `diagnostics/overview` conta o Master em `activeUsers`** — ✅ **resolvido no backend** (commit `01ec08f`):
  `DiagnosticsService` exclui o Master de `activeUsers`/`inactiveUsers`/`admins` **e** do ranking `topUsers`
  (idem `SystemService` / `/api/system/audit`). O contorno do front pode sair (ou ficar — é inofensivo).
- [x] **Auto-delete server-side** — ✅ **resolvido no backend** (2026-06-04): `UserService.DeleteAsync` rejeita
  apagar a própria conta → **403** "Você não pode excluir a própria conta." (verificado). O esconder do botão no
  front agora tem o guard do servidor por trás.
- [ ] **Notificações `kind`** — "Execução abortada" emite `kind: error`, deveria ser **`warning`** (front já
  renderiza âmbar); faltam as notificações de **falha da placa** e **OTA** (backend #3).
- [ ] **Aviso de pouco espaço em disco** — o backend já notifica (sino + e-mail); confirmar a tela no front.
- [ ] **Simular atualização (OTA)** — o front já tem o card "atualização disponível"; pedir ao backend como faria.
- [x] ✅ **Feito no front** (`cb2c972`): `PROFILE_MAX_POINTS` 100 → 50 em `src/lib/limits.ts` + editor bloqueia >50. **Perfil: cap 100 → 50 pontos/segmentos** — backend baixou `DomainConstants.ProfileMaxPoints` de 100 p/ **50**
  (commit `207f90f`): na run o perfil vai pra placa de potência como **segmentos** via RS422 (capacidade ≤50; pontos
  de import direto viram segmentos lineares). **Front:** atualizar `PROFILE_MAX_POINTS` em `src/lib/limits.ts`
  (100 → 50) + o comentário, e garantir que o editor de perfil **bloqueie acima de 50** segmentos.

## Front — revalidar no device (1024×600)

- [~] **#3 — CTRL+F5 em Programas → burst de toasts "Execução abortada"** — investigado: não há toast disso no
  código (é replay do hub ao reconectar; o dedupe já mitiga). Se persistir, suprimir por timestamp da conexão.
- [~] **#11 favoritar / #12 editar+salvar** — investigados, sem repro por leitura de código; confirmar no
  device real que o "pisca branco" sumiu e que Salvar sai da tela.
- [ ] **Limpeza destrutiva de verdade** — nunca rodada (apaga registros reais server-side). Precisa de OK
  explícito; validar que deleta, que o toast traz o `deleted` real e que o overview recarrega.

## Ideias

- [ ] Qual a dificuldade de implementar **GraphQL**?

## Ambiente / infra (não é código do app)

- [ ] `yarn tsc` reclama de um arquivo **gerado** corrompido do Next (`.next/dev/types/validator.ts` sem o
  `import type`) — `rm -rf .next` + restart do `yarn dev` regenera. Não afeta o app rodando.
- [ ] O **backend (`:5248`) caiu várias vezes** na sessão (volta sozinho em segundos) — instável; vale investigar.
</content>
