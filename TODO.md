# TODO — Frontend (reflow-oven)

Roadmap da interface. Notas técnicas pontuais usam o marcador `TODO(backend)` no código
(`grep -rn "TODO(backend)" src/`). Tarefas que dependem do backend vão para `../reflow-oven-backend/TODO.md`.

## ⏭️ Ao retomar (próxima sessão) — 2026-06-01

Front e backend estavam **parados** ao encerrar. Ao subir os dois (`yarn dev` + backend):

1. [x] **#9 re-confirmado ao vivo (2026-06-03)** — com login real: o editor barra ponto **< 50 °C** (digitar 30
   → vira 50; 75 passa) e o **eixo do gráfico de perfil começa em 0** (a rampa sai de (0,0)).
2. **Executar as tarefas do backend** conforme chegarem. O `../reflow-oven-backend/TODO.md` mapeia o que cada
   entrega do backend destrava no front:
   - Endpoints `/deleted` · `/restore` · `/purge` (MasterOnly) → montar a **tela Lixeira** (aba própria de
     Configurações, só-Master). Métodos no `api.ts` já existem (`listDeleted*`/`restore*`/`purge*`).
   - [x] **`comparison` real (verificado 2026-06-03)** → a tabela **"Comparativo do Perfil"** voltou a aparecer
     (execução abortada mostra a linha real: prog 150°C / real 17°C, desvios -133°C / -53s).
   - [x] **`diff` / `beforeCurve` / `afterCurve` / `?before=` (verificado 2026-06-03)** → detalhe da Alteração com
     diff estruturado por ponto (Adicionado/Alterado/Removido), curva **antes×depois** real e o toggle
     **"Comparar com"** edição anterior. "Acendeu sozinho"; só faltava tipar `api.change` (era `unknown`).
   - Notificações: a **"Execução abortada" já gera notificação**, mas com `kind: error` — falta o backend emitir
     **`warning`** (front já renderiza âmbar) + criar as de **falha da placa** e **OTA** (backend TODO #3).
   - [x] **Limpeza real (front) — feito 2026-06-03** (commit `51f0268`): `maintenance.ts` consome
     `GET /api/maintenance/overview` (contagens + tamanho do banco + HD + SO reais); `MOCK_RECORD_COUNTS` e a
     flag local `cleanupStore` removidos. **⚠️ Testar ao vivo depois:** (a) rodar uma **limpeza destrutiva de
     verdade** — só validei a leitura, não apaguei registros reais: conferir que deleta server-side, que o
     toast traz o `deleted` real e que o overview recarrega; (b) as 2 categorias novas **Programas** e
     **Usuários ativos** (hoje "vazio") **acendem e funcionam** quando o backend mandar as contagens — em
     especial validar que o backend **poupa o usuário logado** em "Usuários ativos" (backend TODO #5).

> **Status (2026-05-31):** base pronta (monitoramento, programas, relatórios, configurações,
> login/perfis) e integrada ao backend real (.NET + SignalR, JWT). Em andamento: o lote de
> **Bugs — Validação 2026-05-31** abaixo. As capturas referenciadas estão em `~/Pictures/`.

## Bugs — Validação 2026-05-31 (em triagem)

Os 8 primeiros estão sob investigação por um workflow de triagem (raiz + arquivos + correção).

### UI / toasts

1. [x] **Toasts de erro com ícone errado** — todo erro mostrava o "check" verde; deve ser um **X**
   vermelho. _Feito (`5224f0f`):_ as 22 chamadas `showToast(...)` de falha passaram a usar `"error"`
   e o ícone do tipo `error` no `Toaster` virou `cancel` (círculo com X).
2. [x] **Spam do toast "Não foi possível conectar ao servidor"** — _Feito (`b9824fb`):_ dedupe por
   `${type}:${message}` numa janela de `TOAST_DEDUPE_MS` (5 s) — toasts idênticos não repetem.
   _Feito 2026-06-03:_ no login, o erro de conexão (`status 0`) agora mostra um **bloco de ajuda** com
   **possíveis soluções** (servidor ligado / rede / endereço) em vez do inline truncado — `login()` devolve
   `kind: "connection"` e o erro de credencial continua inline. Verificado ao vivo (`route.abort`).
3. [~] **CTRL+F5 na tela de Programas → vários toasts "Execução abortada"** — _Investigado:_ não existe
   toast "Execução abortada" no código atual (o `RunModal` só faz toast em "concluída"/erro; `onStatus`
   "aborted" não dispara toast). O dedupe do #2 já barra repetições. Revalidar no device — se ainda
   ocorrer, é replay de evento do hub ao reconectar (suprimir por timestamp da conexão).
4. [x] **SignalR: "The connection was stopped during negotiation"** — _Feito (`6a6c5cb`):_ `realtime.ts`
   ganhou guarda de ciclo de vida (cleanup roda uma vez; pula `SubscribeRun` se cancelou durante a
   negociação; `stop()` com `.catch` que engole o erro de negociação interrompida) + backoff fixo
   `SIGNALR_RECONNECT_DELAYS_MS`.

### Relatórios

5. [x] **Status "Abortado" distinto de "Falha" (verificado 2026-06-03)** — `StatusBadge` renderiza
   **Abortado** com `stop_circle` âmbar (≠ `cancel` vermelho da Falha) e o tipo `ExecutionStatus` inclui
   "Abortado"; o backend já retorna esse status. (`2026-05-31_15-05.png`)
6. [x] **Motivo da falha + link pro Relatório de Erros (verificado ao vivo 2026-06-03)** — o detalhe da
   execução com falha mostra "MOTIVO DA FALHA" (ex.: "Sobretemperatura na grelha (termopar tipo-K)", Código
   E-101) e o botão **"Ver no Relatório de Erros"**, que pula pro detalhe do erro ("Snapshot da Falha").
7. [~] **Gráfico antes × depois (detalhe da Alteração) — majoritariamente feito.** (`2026-05-31_15-16.png`, `aaaaaaa.png`)
   _Status 2026-06-03:_ **um só gráfico** (verificado ao vivo) com a edição aberta em **linha contínua** e as
   demais **tracejadas** ("Antes" + toggle "Comparar com"); o **diff estruturado** por ponto (sugestão do dono)
   chegou do backend e renderiza (Adicionado/Alterado/Removido). (a) usa a curva resultante (`afterProfile`) e
   (d) o `EditionCompare` filtra por data (`before: change.atIso`, exclui posteriores) — **ambos no código**
   (comentários "7d"). _Falta:_ só o polish de layout vs. Figma (c) e um olhar no device.
   - a. Não está usando a curva da **última** modificação (o texto está certo, a curva não).
   - b. **Um só gráfico** (o de cima): habilitar/desabilitar as curvas nele; **remover o de baixo**.
        A edição aberta fica **linha contínua** e as demais **tracejadas**.
   - c. Refazer o layout seguindo o **exemplo do Figma**.
   - d. Listar as **outras** modificações por data, **excluindo as posteriores** à aberta (abrir a
        penúltima não deve mostrar a última) → o `EditionCompare` deve filtrar por data, não só `!== id`.
   - _Sugestão do dono:_ trocar o JSON atual (que mistura `changed-before`/`changed-after` como itens
     separados) por um **diff estruturado** por ponto: cada índice uma vez, com `before`, `after`,
     `status` (`unchanged`/`changed`/`added`/`removed`) e `changedFields` (+ um `summary` com contagens).
     _(Tarefa de backend; ver TODO do backend — o front consumiria esse formato.)_

### Configurações / TopBar

8. [x] **Ping: campo HOST/IP desalinhado com o campo Porta.** (`2026-05-31_15-08.png`) — aba Rede.
   _Feito (`6c42b97`):_ a linha virou `items-start` e o botão Testar ganhou `mt-[1.625rem]` (altura do label).
9. [x] **Ícone de WiFi "zoado".** (`2026-05-31_15-11.png`) — _Investigado:_ a captura era a ligadura
   `signal_wifi_3_bar` desenhada como TEXTO (fonte offline) — já resolvido pela fonte self-hospedada
   (`7118783`); hoje o `IconWifi` é glyph. _Feito 2026-06-03:_ `IconWifi` passou a aceitar `className` e o
   TopBar passa uma constante única `STATUS_ICON_CLASS` pros 4 ícones de status (WiFi/cabo + servidor) —
   o `--icon-size` agora mora num só lugar, sem duplicação.
10. [x] **Botão de notificação (sino):** ao clicar, levar à tela de Notificações (atualização nova,
    erros, etc.); o badge "3" são as não vistas. _Feito (`e47b591`):_ o sino virou `Link` para
    `/notificacoes` (`btn-press`); o badge de não vistas continua.

### Programas / execução

11. [~] **Favoritar/desfavoritar — store já otimista (sem refetch).** _Investigado 2026-06-03:_
    `programStore.toggleFavorite` (e `deleteProgram`) já alternam o flag no cache e `notify()` na hora,
    **sem `loadPrograms`** (comentário "no refetch → no flicker"), persistindo via o POST dedicado
    `api.toggleFavorite`. _Falta:_ revalidar no device que o "pisca branco" sumiu de fato.
12. [~] **Editar programa + Salvar não sai da tela** — _Investigado:_ o `handleSave` é compartilhado e já
    chama `router.push("/programas")` tanto ao criar quanto ao editar; o palpite de "faltou await" estava
    errado (`router.push` é void no Next 16). Não reproduz por leitura de código — revalidar no device
    (precisa do backend para o save concluir).
13. [ ] **Usuário `vanessa` (Regular) recebe 403 ao iniciar programa** (`POST /api/runs/start` → 403).
    Definir se Regular pode executar; se sim, é permissão no backend; se não, esconder/bloquear no front.
14. [ ] **Criação de usuário com problemas** — (a) o erro "usuário já existe" aparece no campo **antes**
    de fechar o modal (resposta do servidor chega antes do fechamento); (b) **não consigo logar** com a
    senha que criei. Investigar o fluxo de criação + hash/login. _(Provável backend; ver TODO do backend.)_

### Diversos

15. [x] **Firefox: ao usar a senha salva, o fundo do campo fica branco.** (`2026-05-31_15-31.png`)
    _Feito (`1f75882`):_ `:-webkit-autofill` + `:autofill` com box-shadow inset em `--card-bg` e
    `-webkit-text-fill-color: var(--fg)` (globals.css) — o autofill respeita o tema.
16. [x] **Modais limitam largura em telas grandes sem necessidade** (`2026-05-31_15-55.png`) —
    _Feito (`8781c1e`):_ o `Modal` usa `w-[min(90vw,80rem)]` e o `RunModal` `w-[min(96vw,90rem)]`
    (crescem em telas grandes; mantêm o baseline 1024×600).
17. [x] **Tela de login não deveria ter o botão de trocar tema** — _Feito (`db0b0b3`):_ o `ThemeToggle`
    no TopBar agora é gated por usuário logado (`{user && …}`), some no /login.
18. [x] **Limitar escrita e colagem pelos `min`/`max` do campo** — _Feito (`ef42aa9`):_ o `NumberField`
    (campos de Configurações) ganhou `onPaste` que faz clamp do CTRL+V, via helper `clampToRange`/
    `parseClampedPaste` (`lib/numericInput.ts`). _Auditado 2026-06-03:_ a **porta do ping** (RedeTab) e
    **todos** os campos numéricos de Configurações (Geral/Calibração) usam `NumberField` (clamp no paste+blur);
    os dois únicos `type='number'` crus (editor de programa) já clampam no `onChange` — que também pega o
    paste. Nenhum input numérico sem clamp.
19. [x] **Casas decimais** — _Verificado:_ `formatReading` (`lib/sensors.ts`) já faz RPM com 0 casas
    (`Math.round`) e °C/V/A com 1 casa (`toFixed(1)`); BottomBar e Diagnóstico usam essa função.
20. [x] **Nova aba "Log" em Diagnóstico (somente login dev)** — _Feito (`6de510b`):_ aba **Log** só
    para o papel **Master** (`isMaster`), com dois fontes via `Segmented`: **Navegador** (lê `logger`
    ao vivo, pausar/limpar, teto `LOG_RING_MAX`=500, some ao recarregar) e **Sistema** (faz polling de
    `GET /api/system-log` a cada `SYSTEM_LOG_POLL_MS`=2 s, filtro por nível). Verificado headless
    (role Master → aba presente; Navegador `1/500 linhas`; Sistema 45 linhas). _Backend: criar o
    usuário Master no BD + claim de papel — ver TODO do backend; o hub de push do system-log é opcional._

## Pendências de backend (validar quando publicar)

Itens a escrever/validar no `../reflow-oven-backend/TODO.md` (descrever o que se espera e o formato de retorno):

- [x] **Diff estruturado da Alteração** (ver bug 7) — _validado ao vivo 2026-06-03:_ o backend entrega o
  `diff` (por ponto: `before`/`after`/`status`/`changedFields` + `summary`) e o front já consome.
- [x] **POST de favoritar/desfavoritar e deletar por id** (ver bug 11) — `api.toggleFavorite`/`deleteProgram`
  existem e o `programStore` aplica otimista (sem refetch).
- [ ] **Permissão de `runs/start` para Regular** (ver bug 13) — confirmar a regra.
- [x] **Curva `changed-before` (item H)** — _validado 2026-06-03:_ a curva antes×depois
  (`beforeCurve`/`afterCurve`) renderiza no detalhe da Alteração; o `reportsClient` consome as reais.
- [ ] **Aviso de pouco espaço em disco (item D)** — backend já notifica (sino + e-mail); confirmar a tela.
- [ ] **Simular atualização do HTML (e do backend)** — pedir ao backend sugestões de como faria
  (futuramente talvez o STM32); o front já tem o card "atualização disponível".
- [x] **Valores reais de tamanho do banco / espaço em HD** — _feito 2026-06-03:_ a Manutenção mostra o
  tamanho do banco + HD + SO reais do `GET /api/maintenance/overview` (commit `51f0268`).

## Perguntas / ideias

- [~] **Log de Operação (auditoria completa)** — *pedido do Lucas 2026-06-04 (ref. print accelero em
  `~/Pictures/2026-06-04_11-00.png`).* Trilha única **DATA/OPERADOR/TIPO/OBJETO/OBJETO ID/DADOS** cobrindo
  alteração/execução/erro/**comunicação**/login/calibração. Decidido **backend primeiro** — spec detalhada
  (modelo + cobertura + `GET /api/operation-log` + contrato `OperationLogEntryDto`) já registrada no
  `../reflow-oven-backend/TODO.md` **#9**. **Front (refinado 2026-06-04):** **substitui a aba Diagnóstico → Log**
  (a atual, "feia"); separar **por categoria** — **Tudo** + Execução · Alteração · Usuário · Erro · Comunicação ·
  Falha (cada uma = `?category=…`); **paginação obrigatória** (reusa o `Pagination` de Relatórios). Espelha o
  print (1024×600) e **aguarda o endpoint**.
- [ ] Qual a dificuldade de implementar GraphQL?

## Feito

- [x] **Editor de programa — limite de 100 pontos + contador + tempo total** (`PROFILE_MAX_POINTS=100`,
  espelha `DomainConstants.ProfileMaxPoints`); contador `x/100 pontos` (âmbar no teto) e tempo total.
- [x] **Guard do gráfico de perfil contra domínio degenerado** — tempo total 0 não gera mais coordenadas
  NaN; `SALVAR` exige tempo total > 0 (segmentos de 0 s individuais continuam permitidos).
- [x] **Relatórios — histórico de edições (multi-curva)** — no detalhe da Alteração, "Comparar com
  outras edições" busca as edições (`GET /api/changes?programId=`, teto `CHANGE_RETENTION_PER_PROGRAM_MAX`)
  e deixa ticar quais sobrepor no gráfico (cada uma com sua cor). _(Será refeito pelo bug 7.)_
- [x] **Informação — carga da CPU (%)** — `GET /api/system/metrics` com polling leve; isolado em
  `CpuLoadRow` (o tick não re-renderiza a tela toda).
- [x] **Relatórios — rotas das listas corrigidas** (sem o prefixo errado `/api/reports`).
- [x] **Tema + séries do gráfico por usuário** — `GET/PUT /api/me/preferences`; hidratado da sessão,
  gravação otimista com rollback, tema aplicado antes do paint (sem flash).
- [x] **Aba Rede** — interfaces (`GET /api/system/interfaces`), prioritária (`POST .../priority`) e porta no ping.
- [x] **Relatórios — paginação + filtros no servidor** (`page/pageSize/search/from/to` + filtro por aba).
- [x] **Relatório de execução — gráfico multi-sinal** (corrente/tensão/RPM/temperaturas via `Trace`).
- [x] **Programas — paginação no servidor** (`programStore` virou cache por página; clamp em 100).
- [x] **Card "atualização disponível" real** (`GET/POST /api/system/update`; botão só Admin).
- [x] **Sino/Notificações reais** (`GET /api/notifications` + `unread-count` + `read-all`; toast em nova).
- [x] **Ícones Wi-Fi × cabo + globo na TopBar** (`GET /api/system/status`). _(Ajuste visual no bug 9.)_
- [x] **Cadastro de usuário — senha no formulário** (Senha + Confirmar, mín. 8/máx. 72; sem default).
- [x] **Integração com o backend (.NET)** — REST + SignalR; auth JWT + recuperação de senha; execução
  ao vivo (start/stop + telemetria); leituras ao vivo; toasts na resposta da API.
- [x] Upgrade Next 16 / React 19.2 / TS 6 / Tailwind 4 (ESLint fixo em 9.x, flat config) + merge na `develop`.
- [x] Monitoramento (TopBar + galeria paginada + BottomBar + Sidebar drawer/docagem responsiva).
- [x] Gráfico do perfil (SVG próprio, responsivo, auto-compacto); sensores ao vivo; tipografia fluida.
- [x] **Programas** — Ver Gráfico, Editar, Deletar (confirmação + tombstones), Favoritar, busca, ordenar, filtrar.
- [x] **Relatórios** — abas Execuções/Alterações/Erros (busca, filtro, intervalo de datas, paginação) e
  detalhes (Execução com Programado × Real + falha; Erro com snapshot interativo; Alteração com perfil/diff).
- [x] **Configuração** — 5 abas (Geral/Usuários/Rede/Notificações/Diagnóstico).
- [x] **Login + permissões** — papéis Admin (tudo) / Regular (Início + Programas) com guarda de rota e logout.
- [x] **Tema claro/escuro** (toggle na TopBar; tokens semânticos por `data-theme`).
- [x] **Diagnóstico** — estatísticas/rankings, sub-abas Sensores e Manutenção (limpeza do banco, reset de fábrica).
- [x] **INICIAR** — execução ao vivo com 3 gráficos sincronizados, crosshair compartilhado, fase/tempo/progresso.
- [x] **Calibração** — aba em Configurações (login técnico), assistente de calibração da saída.
</content>


## ✅ Bloco A (consumir backend) — FEITO no front (2026-05-31, noite)

Os 6 itens abaixo foram implementados e commitados (`tsc`/`lint` limpos, review adversarial, verificados
no 1024×600 onde havia dado). Resumo:

1. **Regular inicia/para (item 1) — `fix` (#13):** nada a mudar; iniciar/parar já estava liberado pro Regular
   (só criar/editar/excluir é admin). Confirmado por leitura + execução.
2. **Cadastro sem senha + Trocar senha (item 2 / #14) — `31c1c4d` `4af1b26` `e4ba6e9` `1b71ab9`:** removidos os
   campos Senha/Confirmar (servidor envia por e-mail, com nota no modal); `api.changePassword` + `mustChangePassword`;
   **"Trocar senha"** self-service no menu lateral pra **todos os papéis** (modal na raiz do AppShell — não preso ao drawer);
   fluxo forçado quando a sessão vem com `mustChangePassword`.
3. **Status "Abortado" (item 3 / #5) — `4e07551` `a52f87a`:** `ExecutionStatus(+Wire)` ganhou `"Abortado"`; `StatusBadge`
   virou mapa (verde/vermelho/âmbar `stop_circle`) + opção de filtro em Relatórios → Execuções. ✔ verificado.
4. **Motivo + link (item 4 / #6) — `4e07551` `a52f87a`:** `ExecutionDetailDto` traz `failureReason`/`errorCode`/
   `linkedErrorId`; detalhe mostra o motivo + botão "Ver no Relatório de Erros". _A seção só aparece quando o backend
   popula esses campos (registro de falha precisa tê-los)._
5. **Favoritar/deletar otimista (item 5 / #11) — `7156602`:** `programStore` faz update otimista (sem `loadPrograms`,
   sem flicker), revertendo em erro; `api.toggleFavorite(id, favorite?)` manda `{ favorite }` (set idempotente).
6. **Diff estruturado + gráfico antes×depois (item 6 / #7) — `1fe0fee` `84cb025`:** tipos do diff + curvas + `?before=`;
   `ChangeDetail` virou **um gráfico só** (aberta contínua / antes+outras tracejadas, edições filtradas por data),
   tabela diff destaca célula a célula por `changedFields` (igual ao Figma "Example Change Program").
   - ⚠️ **DEPENDE DE DEPLOY DO BACKEND:** a instância rodando devolve `diff`/`beforeCurve`/`afterCurve` = **null** e
     **ignora `?before=`** (ver `../reflow-oven-backend/TODO.md`, seção "DEPLOY/DADOS"). O front **não regride** (curva
     reconstruída dos pontos; tabelas no formato antigo; lista de edições degrada p/ "todas menos a atual"). O destaque
     por `changedFields`, o antes×depois real e o filtro por data **acendem sozinhos** quando o backend servir os campos.

### (Especificação original do backend pronto, p/ referência)

1. **Regular inicia/para execução (item 1):** `POST /api/runs/start` e `/stop` agora aceitam o papel **Regular** (não dá mais 403). Nada a mudar no contrato — só conferir que o fluxo de INICIAR/PARAR funciona para o operador.

2. **Cadastro de usuário = senha por e-mail + vencimento (item 2):**
   - `POST /api/users` **não recebe mais `password`** — remover os campos *Senha/Confirmar senha* do `UserCreateModal`, a obrigatoriedade em `users.ts` e o `password` de `api.createUser`/`upsertUser`. Avisar "a senha será enviada por e-mail".
   - **Senha provisória vencida:** se o login devolver `{ ok:false, error:"Sua senha provisória expirou. Enviamos uma nova senha para o seu e-mail." }`, o front deve **mostrar essa mensagem** e orientar o usuário a consultar o e-mail (o backend já reenviou uma nova senha, throttle 1×/dia). Hoje `auth.ts login()` já repassa `result.error` verbatim — basta garantir que esse caso fique claro na UI (ex.: destaque/realce, não um toast genérico).
   - (Opcional) tratar `session.mustChangePassword` no login abrindo o modal de troca (`POST /api/auth/change-password` já existe).

3. **Status "Abortado" (item 3):** `ExecutionStatusWire`/`ExecutionStatus` ganham `"Abortado"`; `StatusBadge` vira mapa por status (`Concluído`→verde, `Falha`→vermelho, `Abortado`→âmbar `stop_circle`); adicionar a opção de filtro `Abortado` em Relatórios → Execuções.

4. **Motivo da falha + link (item 4):** `ExecutionDetailDto` traz `failureReason`/`errorCode`/`linkedErrorId` (nuláveis). Mostrar o motivo no detalhe e, quando `linkedErrorId != null`, botão "Ver no Relatório de Erros" → `setTab("erros")` + abrir `GET /api/errors/{id}`.

5. **Favoritar sem flicker (item 5):** `POST /api/programs/{id}/favorite` aceita corpo `{ favorite: bool }` (set idempotente). Fazer **update otimista local** em `programStore.toggleFavorite`/`deleteProgram` (alternar a flag/filtrar a lista + `notify()`, **sem** `loadPrograms`), revertendo em erro. Resposta `{ favorite }` inalterada.

6. **Diff estruturado da Alteração (item 6):** `GET /api/changes/{id}` traz `diff { summary, points[] }` (1 linha/índice, `status` ∈ `unchanged|changed|added|removed`, `changedFields` ∈ `temp|timeSec|ramp`) + `beforeCurve`/`afterCurve`. `GET /api/changes?before=<ISO>` lista só edições estritamente anteriores. Refazer o gráfico antes×depois (único, aberta contínua/demais tracejadas), consumir `diff` no lugar do particionamento por `role`, e usar `before=change.at` no `EditionCompare`. `at` continua ISO (formatar só na exibição).


7. **Usuário Master + aba Log (item 7):** o backend agora emite `role: "Master"` no login/`/api/auth/me` (o tipo `Role = "Admin"|"Regular"|"Master"` e `isMaster()` já existem no front), então a aba **Diagnóstico → Log** aparece sozinha para a conta Master. Login dev: `dev.pandewilly` / `pandewilly`. O Master herda todos os acessos de Admin e **não** aparece na grade de Usuários. Para o log em **tempo real** (fonte "Sistema"), trocar o polling de `GET /api/system-log` (2s) por uma assinatura SignalR: conectar em `/hubs/systemlog` (mesmo JWT via `?access_token=`, como telemetry/diagnostics) e ouvir o evento **`SystemLogLine`**, que entrega um `SystemLogDto` (`{ id, at, level, message }`) — o mesmo shape do polling — para prepender na lista. O polling pode ficar como fallback inicial/refresh.

8. **Soft-delete + Lixeira do Master (não apagar dados de verdade):** o backend deixou de remover do banco —
   **Usuários, Programas e Notificações** passam a *soft-delete* (`isDeleted` + `deletedAt` + `deletedBy`).
   As listas normais já escondem os apagados (filtro no servidor), então **as telas comuns não mudam** (o
   Admin continua "excluindo" igual; vira soft por baixo). O que adicionar, **somente para a conta Master**
   (`isMaster()` já existe):
   - Uma tela/aba **"Apagados" (Lixeira)** que consome endpoints **MasterOnly** (403 para Admin/Regular):
     - `GET /api/users/deleted` · `GET /api/programs/deleted` · `GET /api/notifications/deleted` → só os
       apagados, com `deletedAt`/`deletedBy` (quem apagou e quando);
     - `POST /api/users/{id}/restore` (idem programs/notifications) → restaura;
     - `DELETE /api/users/{id}/purge` (idem) → apaga **definitivo/irreversível** — confirmar com o usuário.
   - **Só o Master** vê/restaura/expurga; Admin e Regular nem enxergam a Lixeira.
   - **Nome de usuário segue único inclusive contra apagados:** recriar com o nome de um usuário apagado é
     rejeitado (o Master pode restaurá-lo depois) — manter a mensagem de conflito atual.
   - **Log de Alterações (auditoria) é protegido:** **remover a categoria "Alterações"** da Limpeza da
     Manutenção (não é mais apagável pela tela). As demais categorias da Limpeza seguem (Admin+Master).

9. **Limites do perfil — backend alinhado (mín. ponto 50 °C / baseline 0 °C):** o backend agora **rejeita
   ponto < 50 °C** (exceto o t=0) e toda curva **começa em 0 °C** (era 25 °C ambiente) — espelhando
   `POINT_TEMP_MIN = 50` e `START_TEMP = 0` que já estão no front. Nada novo a implementar; só garantir que o
   editor barre digitar < 50 e que o eixo do gráfico comece em 0. Os ~50 programas de fábrica re-semeados já
   vêm com `(0, 0)` no início.
   - Bônus (sem ação no front): o **snapshot da falha** (Relatórios → Erros) passou a ter **7 curvas distintas
     por sinal** (temperatura S + pico, corrente com ripple, tensão com queda, ventoinhas que caem) com
     assinatura de falha — o gráfico fica legível, não mais "todas as curvas iguais".

10. **Contas Admin/Regular configuráveis (backend):** as contas iniciais de Admin e Regular agora vêm da
    config (`Admin__*` / `Regular__*`, como o Master) — só relevante pro deploy/seed do backend; **sem impacto
    no front** (o login segue igual). Registrado aqui só pra constar.
