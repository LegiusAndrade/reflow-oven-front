# TODO — Frontend (reflow-oven)

Roadmap da interface. Notas técnicas pontuais usam o marcador `TODO(backend)` no código
(`grep -rn "TODO(backend)" src/`). Tarefas que dependem do backend vão para `../reflow-oven-backend/TODO.md`.

> **Status (2026-05-31):** base pronta (monitoramento, programas, relatórios, configurações,
> login/perfis) e integrada ao backend real (.NET + SignalR, JWT). Em andamento: o lote de
> **Bugs — Validação 2026-05-31** abaixo. As capturas referenciadas estão em `~/Pictures/`.

## Bugs — Validação 2026-05-31 (em triagem)

Os 8 primeiros estão sob investigação por um workflow de triagem (raiz + arquivos + correção).

### UI / toasts

1. [x] **Toasts de erro com ícone errado** — todo erro mostrava o "check" verde; deve ser um **X**
   vermelho. _Feito (`5224f0f`):_ as 22 chamadas `showToast(...)` de falha passaram a usar `"error"`
   e o ícone do tipo `error` no `Toaster` virou `cancel` (círculo com X).
2. [~] **Spam do toast "Não foi possível conectar ao servidor"** — _Feito (`b9824fb`):_ dedupe por
   `${type}:${message}` numa janela de `TOAST_DEDUPE_MS` (5 s) — toasts idênticos não repetem.
   _Pendente (enhancement):_ a mensagem trazer também **possíveis soluções** (texto de ajuda).
3. [~] **CTRL+F5 na tela de Programas → vários toasts "Execução abortada"** — _Investigado:_ não existe
   toast "Execução abortada" no código atual (o `RunModal` só faz toast em "concluída"/erro; `onStatus`
   "aborted" não dispara toast). O dedupe do #2 já barra repetições. Revalidar no device — se ainda
   ocorrer, é replay de evento do hub ao reconectar (suprimir por timestamp da conexão).
4. [x] **SignalR: "The connection was stopped during negotiation"** — _Feito (`6a6c5cb`):_ `realtime.ts`
   ganhou guarda de ciclo de vida (cleanup roda uma vez; pula `SubscribeRun` se cancelou durante a
   negociação; `stop()` com `.catch` que engole o erro de negociação interrompida) + backoff fixo
   `SIGNALR_RECONNECT_DELAYS_MS`.

### Relatórios

5. [ ] **Execução parada por falha aparece "Falha", mas o log diz "Execução abortada"** — quando foi
   abortada, mostrar status/ícone **"Abortado"** (não o de erro). (`2026-05-31_15-05.png`)
6. [ ] **Execução com falha deve mostrar o motivo** — hoje só diz "Falha". Exibir o **motivo** e, sendo
   falha, um **link para o Relatório de Erros** (idealmente já filtrado no erro correspondente).
7. [ ] **Gráfico antes × depois (detalhe da Alteração) — refazer.** (`2026-05-31_15-16.png`, `aaaaaaa.png`)
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
9. [~] **Ícone de WiFi "zoado".** (`2026-05-31_15-11.png`) — _Investigado:_ a captura era a ligadura
   `signal_wifi_3_bar` desenhada como TEXTO (fonte offline) — já resolvido pela fonte self-hospedada
   (`7118783`); hoje o `IconWifi` é glyph. A tentativa de igualar o `--icon-size` dos vizinhos foi
   revertida (o `IconWifi` não aceita `className`); refazer dando suporte a `className` se ainda destoar.
10. [x] **Botão de notificação (sino):** ao clicar, levar à tela de Notificações (atualização nova,
    erros, etc.); o badge "3" são as não vistas. _Feito (`e47b591`):_ o sino virou `Link` para
    `/notificacoes` (`btn-press`); o badge de não vistas continua.

### Programas / execução

11. [ ] **Favoritar/desfavoritar recarrega o programa todo (pisca "branco")** — só alternar o favorito
    está reenviando/recarregando o programa inteiro. Deve haver um **POST dedicado de favoritar/
    desfavoritar por id** (idem para deletar por id), sem refetch da lista inteira. _(Pode ter parte
    no backend; ver TODO do backend.)_
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
18. [~] **Limitar escrita e colagem pelos `min`/`max` do campo** — _Feito (`ef42aa9`):_ o `NumberField`
    (campos de Configurações) ganhou `onPaste` que faz clamp do CTRL+V, via helper `clampToRange`/
    `parseClampedPaste` (`lib/numericInput.ts`). _Pendente:_ porta do ping (RedeTab) e auditar os demais;
    os inputs do editor de programa já fazem clamp no `onChange`.
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

- [ ] **Diff estruturado da Alteração** (ver bug 7) — formato proposto pelo dono (por ponto: `before`/
  `after`/`status`/`changedFields` + `summary`); o front passaria a consumir esse JSON.
- [ ] **POST de favoritar/desfavoritar e deletar por id** (ver bug 11).
- [ ] **Permissão de `runs/start` para Regular** (ver bug 13) — confirmar a regra.
- [ ] **Curva `changed-before` (item H)** — `reportsClient` já preparado (particiona por `role` e
  preenche `beforeProfile`); validar `role` exatamente `"changed-before"`/`"changed-after"`.
- [ ] **Aviso de pouco espaço em disco (item D)** — backend já notifica (sino + e-mail); confirmar a tela.
- [ ] **Simular atualização do HTML (e do backend)** — pedir ao backend sugestões de como faria
  (futuramente talvez o STM32); o front já tem o card "atualização disponível".
- [ ] **Valores reais de tamanho do banco / espaço em HD** — confirmar que vêm mesmo do backend.

## Perguntas / ideias

- [ ] Log das operações set/update (e get): registrar o que retornou e o que foi setado.
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


## 🟢 Backend pronto (2026-05-31) — consumir no front

O backend implementou os 6 itens da Validação 2026-05-31 + o programa-teste (ver `../reflow-oven-backend/TODO.md`, banner "Implementado no backend"). Build + 78 testes verdes. O que o front precisa fazer:

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
