# DONE — Frontend (reflow-oven)

Histórico do que **já foi feito** (arquivado do antigo `TODO.md`). O roadmap em aberto vive em `TODO.md`;
tarefas de backend vão para `../reflow-oven-backend/TODO.md`.

## Sessão 2026-06-27 — Autotune do PID + cap do perfil (50)

- [x] **Tela de Autotune do PID** (`54183a1`) — nova aba **Autotune** em Configurações (sessão técnica /
  `CalibrationOnly`, ao lado de Calibração): disparar/cancelar (`/api/autotune/start`·`/cancel`), progresso
  ao vivo (poll ~1 Hz de `/status`: alvo, ciclos, decorrido), **histórico** paginado (`/history`: status,
  alvo, ciclos, Kp/Ki/Kd, quem disparou, e na falha o motivo + código E-1xx) e **aplicar/descartar** os
  ganhos sugeridos com confirmação (antes→depois; `/apply`·`/dismiss`). Status no wire: `Executando` /
  `Concluído` / `Falha` / `Cancelado`. (Spec detalhada mantida no `TODO.md` como referência.)
- [x] **Perfil: cap 100 → 50 pontos** (`cb2c972`) — `PROFILE_MAX_POINTS` 100 → **50** em `src/lib/limits.ts`
  (+ comentário), casando com `DomainConstants.ProfileMaxPoints` e a capacidade de segmentos da placa de
  potência (RS422); o editor de perfil bloqueia acima de 50 pontos.
- [x] **Log de Operação: filtro de período** (date range) — adicionado o par de **DatePicker** (Data inicial /
  Data final, no padrão dos Relatórios, `from`/`to` do `ReportQuery`) ao visualizador Master-only já existente
  (`OperationLog.tsx`, base em `67e3a5e`), além dos chips de categoria.

## Sessão 2026-06-04 — auditoria, Lixeira, permissões e polish

Verificado ao vivo com os logins reais (Admin `lucas.silva`, Master `dev.pandewilly`). `tsc`/`lint` limpos.

- [x] **Modal de Alteração reformulado** (`d84ebbf`) — "Antes" datado com a edição anterior (sem toggle
  duplicado); diff legível **uma linha por ponto** (`antes → depois` por campo); cabeçalho de contexto
  (ação + autor + data); seções coloridas por significado.
- [x] **Log de Operação (auditoria completa)** (`67e3a5e`) — substitui a aba Diagnóstico → Log (Master-only);
  tabela **DATA/OPERADOR/TIPO/OBJETO/OBJETO ID/DADOS** + chips por categoria (Tudo + Execução/Alteração/
  Usuário/Erro/Comunicação/Falha/Calibração/Manutenção) + paginação. `table-fixed`/full-width (preenche a tela,
  quebra de linha + tooltip). Verificado com o Master real (389 registros; filtro por categoria OK).
- [x] **Lixeira do Master** (`ca6f1b6`) — aba **"Lixeira"** (só-Master) em Configurações: Segmented
  Programas/Usuários/Notificações com contagens, **Restaurar** e **Excluir definitivamente** (confirm) por item.
  Consome `/deleted` · `/restore` · `/purge` (MasterOnly). O restore recarrega a store da tela alvo (`5dd4dbd`).
- [x] **Decimais do programa ≤ 2 casas** (`f7ac9d1`) — `PROGRAM_VALUE_MAX_DECIMALS` + `roundToDecimals`,
  aplicado na fronteira `programStore.saveProgram` (PID/calibração ficam fora).
- [x] **Permissões da Limpeza do banco** — Programas/Usuários ativos **só Admin** (Master vê 🔒 "Somente Admin")
  (`5881806`); trash (Programas/Usuários deletados) **Master-only**, Admin nem vê (`080a666`); "Usuários
  inativos" também travado pro Master (`d6f61d2`). Contagem de "Usuários ativos" mostra o total real + toast
  "Seu usuário foi mantido" (`b3c9a3a`, `4155aae`). Categoria "Programas deletados" adicionada (`f256f00`).
- [x] **`canDelete` por item** (`ddec8eb`) — front consome o flag do backend (Admin: qualquer; Master: só os
  criados por ele) p/ gatear Deletar/Remover em programas e usuários. O Admin **não** vê delete na **própria**
  linha (`7919212`); a tela de Usuários refaz o fetch ao montar (canDelete sempre fresco).
- [x] **Diagnóstico → Estatísticas** — "Usuários inativos" aparece **pra todos**; "Usuários deletados" é card
  **Master-only**; contagens de usuário derivadas da store (batem com a tela de Usuários) (`dd32c24`, `b26cb24`).
- [x] **Modal de Limpeza maior em telas grandes** (`8b0d9a7`) — cresce no breakpoint `xl` (device 1024×600 igual).
- [x] **Deletar programa reflui a grade** (`ea87d3e`) — refetch da página após o delete preenche o buraco.

## Auditoria / Log de Operação (decisões, backend #9)

- [x] Spec da trilha genérica registrada no backend (`2182656`); endpoint `GET /api/operation-log` (Master-only,
  paginado, filtros) entregue; **Falha = hardware da placa, Erro = software** (decidido); o front consome.

## Bugs — Validação 2026-05-31 (resolvidos)

1. [x] **Toasts de erro com ícone errado** (`5224f0f`) — falhas usam `"error"`; ícone virou `cancel` (X vermelho).
2. [x] **Spam do toast de conexão** (`b9824fb`) — dedupe `${type}:${message}` em `TOAST_DEDUPE_MS` (5 s). No
   login, erro de conexão (`status 0`) vira **bloco de ajuda** com possíveis soluções (`kind: "connection"`).
4. [x] **SignalR "stopped during negotiation"** (`6a6c5cb`) — `realtime.ts` com guarda de ciclo de vida + backoff fixo.
5. [x] **Status "Abortado" distinto de "Falha"** — `StatusBadge` âmbar `stop_circle`; `ExecutionStatus` inclui "Abortado".
6. [x] **Motivo da falha + link pro Relatório de Erros** — detalhe mostra "MOTIVO DA FALHA" + botão "Ver no Relatório de Erros".
7. [x] **Gráfico antes × depois da Alteração** — um só gráfico (contínua/tracejada), diff estruturado por ponto,
   edições filtradas por data. (Reformulado de vez nesta sessão — ver `d84ebbf`.)
8. [x] **Ping: HOST/IP desalinhado com Porta** (`6c42b97`) — `items-start` + `mt` no botão Testar.
9. [x] **Ícone de WiFi "zoado"** — fonte self-hospedada (`7118783`); `IconWifi` aceita `className`; TopBar usa
   `STATUS_ICON_CLASS` único pros 4 ícones de status.
10. [x] **Sino → tela de Notificações** (`e47b591`) — virou `Link` p/ `/notificacoes`; badge de não-vistas mantido.
15. [x] **Firefox: autofill com fundo branco** (`1f75882`) — `:-webkit-autofill`/`:autofill` respeitam o tema.
16. [x] **Modais limitando largura à toa** (`8781c1e`) — `Modal` `w-[min(90vw,80rem)]`, `RunModal` `w-[min(96vw,90rem)]`.
17. [x] **Login sem botão de tema** (`db0b0b3`) — `ThemeToggle` gated por usuário logado.
18. [x] **Clamp de escrita/colagem por `min`/`max`** (`ef42aa9`) — `NumberField` com `onPaste`; auditado, nenhum input sem clamp.
19. [x] **Casas decimais nas leituras** — `formatReading` (RPM 0 casas, °C/V/A 1 casa).
20. [x] **Aba "Log" em Diagnóstico (só Master)** (`6de510b`) — depois substituída pelo Log de Operação.

## Pendências de backend já validadas

- [x] **Diff estruturado da Alteração** — backend entrega `diff` (por ponto + summary); front consome.
- [x] **Favoritar/deletar por id** — `api.toggleFavorite`/`deleteProgram` + `programStore` otimista.
- [x] **Curva `changed-before`** — `beforeCurve`/`afterCurve` renderizam no detalhe da Alteração.
- [x] **Tamanho do banco / HD reais** (`51f0268`) — Manutenção mostra banco + HD + SO do overview.
- [x] **#9 limites do perfil** — editor barra ponto < 50 °C; eixo do gráfico começa em 0.
- [x] **#10 ordenação "Padrão"** — backend usa `LastUsed ?? CreatedAt`; programa recém-criado vem em 1º.

## Base / Feito

- [x] Integração com o backend (.NET) — REST + SignalR; auth JWT + recuperação de senha; execução ao vivo
  (start/stop + telemetria); leituras ao vivo; toasts na resposta da API.
- [x] Upgrade Next 16 / React 19.2 / TS / Tailwind 4 (ESLint fixo em 9.x, flat config).
- [x] Monitoramento (TopBar + galeria paginada + BottomBar + Sidebar drawer responsivo).
- [x] Gráfico do perfil (SVG próprio, responsivo, auto-compacto); sensores ao vivo; tipografia fluida.
- [x] **Programas** — Ver Gráfico, Editar, Deletar (confirmação + tombstones), Favoritar, busca, ordenar, filtrar; paginação no servidor (clamp 100); editor com limite de 100 pontos + contador + tempo total; guard contra domínio degenerado.
- [x] **Relatórios** — abas Execuções/Alterações/Erros (busca, filtro, intervalo de datas, paginação no servidor)
  e detalhes (Execução com Programado × Real + falha + gráfico multi-sinal; Erro com snapshot interativo;
  Alteração com perfil/diff + histórico de edições multi-curva).
- [x] **Configuração** — abas Geral/Usuários/Rede/Notificações/Diagnóstico (+ Calibração técnica, + Lixeira Master).
  Rede: interfaces + prioritária + porta no ping. Tema + séries do gráfico por usuário (`/api/me/preferences`).
- [x] **Login + permissões** — papéis Admin / Regular / Master com guarda de rota e logout.
- [x] **Tema claro/escuro** (toggle na TopBar; tokens semânticos por `data-theme`).
- [x] **Diagnóstico** — estatísticas/rankings, sub-abas Sensores e Manutenção (limpeza do banco, reset de fábrica), Log.
- [x] **INICIAR** — execução ao vivo com 3 gráficos sincronizados, crosshair compartilhado, fase/tempo/progresso.
- [x] **Calibração** — aba em Configurações (login técnico), assistente de calibração da saída.
- [x] **Informação — carga da CPU (%)** (`/api/system/metrics`, polling leve isolado).
- [x] **Card "atualização disponível" real** (`/api/system/update`; botão só Admin).
- [x] **Sino/Notificações reais** (`/api/notifications` + `unread-count` + `read-all`).
- [x] **Ícones Wi-Fi × cabo + globo na TopBar** (`/api/system/status`).

## Bloco A (consumir backend) — feito no front

1. Regular inicia/para execução — já liberado (só criar/editar/excluir é admin).
2. Cadastro sem senha (servidor envia por e-mail) + "Trocar senha" self-service + fluxo `mustChangePassword`.
3. Status "Abortado" — `ExecutionStatus` + `StatusBadge` (âmbar `stop_circle`) + filtro em Execuções.
4. Motivo + link — `failureReason`/`errorCode`/`linkedErrorId` no detalhe da execução.
5. Favoritar/deletar otimista — `programStore` sem refetch/flicker, revertendo em erro.
6. Diff estruturado + gráfico antes×depois — tipos do diff + curvas + `?before=`; `ChangeDetail` num gráfico só.
7. Usuário Master + aba Log — `role: "Master"`, `isMaster()`; login dev `dev.pandewilly`.
8. Soft-delete + Lixeira do Master — `isDeleted/deletedAt/deletedBy`; telas comuns inalteradas; Lixeira só-Master.
9. Limites do perfil alinhados (mín. 50 °C / baseline 0 °C).
10. Contas Admin/Regular configuráveis no backend (sem impacto no front).
</content>
