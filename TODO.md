# TODO — Frontend (reflow-oven)

Roadmap **em aberto**. O histórico do que já foi feito está em `DONE.md`. Tarefas que dependem do backend
vão para `../reflow-oven-backend/TODO.md` (o front consome quando chegar). Notas técnicas pontuais no código
usam o marcador `TODO(backend)` (`grep -rn "TODO(backend)" src/`).

## Backend (registrado lá; o front já está pronto ou contornado)

- [ ] **#13 — Regular leva 403 ao iniciar programa** (`vanessa`, `POST /api/runs/start` → 403). Decidir se o
  operador pode executar: se sim, liberar no backend; se não, esconder/bloquear no front.
- [ ] **#14 — criação de usuário** — (a) não loga com a senha criada (hash/login no backend); (b) o erro
  "usuário já existe" aparece no campo **antes** de o modal fechar (resposta chega antes).
- [ ] **#11 — `diagnostics/overview` conta o Master em `activeUsers`** — mostra 2 onde a tela de Usuários mostra 1.
  _Contornado no front_ (Estatísticas derivam de `GET /api/users`); o ideal é o overview excluir o Master.
- [ ] **Auto-delete server-side** — o Admin ainda consegue se **auto-deletar** via API direta (quando não é o
  último admin). O front já esconde o botão na própria linha; falta o backend rejeitar (defesa em profundidade).
- [ ] **Notificações `kind`** — "Execução abortada" emite `kind: error`, deveria ser **`warning`** (front já
  renderiza âmbar); faltam as notificações de **falha da placa** e **OTA** (backend #3).
- [ ] **Aviso de pouco espaço em disco** — o backend já notifica (sino + e-mail); confirmar a tela no front.
- [ ] **Simular atualização (OTA)** — o front já tem o card "atualização disponível"; pedir ao backend como faria.

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
