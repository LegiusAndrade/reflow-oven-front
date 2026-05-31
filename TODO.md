# TODO — Reflow Oven UI

Roadmap da interface. Notas técnicas pontuais usam o marcador `TODO(backend)` no código
(`grep -rn "TODO(backend)" src/`).

## Próximas

> O backend fechou os itens A–H (ver `../reflow-oven-backend/TODO.md`). O front já consome **A/B/C/F**
> (ver "Feito"); restam só a verificação visual de **D** e a validação de **H** (quando o backend
> publicar a curva `changed-before`), além dos "Pedidos novos" abaixo.

- [ ] **Aviso de pouco espaço em disco** — o backend já notifica (sino + e-mail, item **D**); confirmar que aparece bem na tela (o feed real do sino já chega).
- [ ] **Alterações — antes × depois numa edição** — o backend vai passar a gravar a curva anterior (`changed-before`) além da `changed-after` no `UpdateAsync`. O `reportsClient` **já está preparado** (particiona por `role` e preenche `beforeProfile` quando `changed-before` aparece → o `ChangeDetail` liga o overlay sozinho). **Validar** assim que o backend publicar: confirmar que o `role` vem exatamente `"changed-before"`/`"changed-after"` e que as duas curvas aparecem.

## Feito

- [x] **Editor de programa — limite de 100 pontos + contador + tempo total** — `PROFILE_MAX_POINTS` subiu de 30 → **100** (espelha `DomainConstants.ProfileMaxPoints`; o backend já estava em 100, só faltava o front). O editor mostra o contador **`x/100 pontos`** (fica âmbar no teto) ao lado de "Adicionar Ponto" e o **tempo total** do perfil (soma das durações dos segmentos). O cap conta segmentos — exatamente o que o backend valida.
- [x] **Relatórios — histórico de edições de um programa** — no detalhe de uma Alteração de programa, a seção "Comparar com outras edições" busca as edições do programa (`GET /api/changes?programId=`, teto `CHANGE_RETENTION_PER_PROGRAM_MAX=10`), lista as datas e deixa **ticar** quais sobrepor no gráfico (multi-curva, cada edição com sua cor; a edição aberta é a curva principal). Usa a curva resultante de cada edição (não depende do `changed-before`). `TemperatureProfileChart` ganhou `overlays`.
- [x] **Informação — carga da CPU (%)** — `api.systemMetrics()` (`GET /api/system/metrics`) com polling leve (`SYSTEM_METRICS_POLL_MS=5s`); o card "Sistema" mostra a **Carga da CPU** (% + °C quando há sensor), junto de armazenamento/firmware.
- [x] **Relatórios — rotas das listas corrigidas** — as chamadas de lista apontavam para `/api/reports/{executions,changes,errors,system-log}` (404 — o backend serve em `/api/{...}` sem prefixo). Corrigido; as tabelas voltam a carregar.
- [x] **Tema + séries do gráfico por usuário** — `preferences.ts`/`theme.ts` consomem `GET/PUT /api/me/preferences`: o tema (claro/escuro/sistema) e quais sinais aparecem no gráfico da execução agora são **por usuário**, não por dispositivo. Hidratados da sessão (sem GET extra), gravação otimista com rollback (+ guarda de corrida) e 403 da sessão técnica tolerado; `layout.tsx` aplica o tema antes do paint (sem flash claro↔escuro).
- [x] **Aba Rede** — lista as interfaces (`GET /api/system/interfaces`), escolhe a prioritária (`POST /api/system/interfaces/priority`) e envia a **porta** no teste de ping; config de rede migrada para `/api/system/*`.
- [x] **Relatórios — paginação + filtros no servidor** — `RelatoriosScreen`/`reportsClient` agora paginam e filtram no backend (`page/pageSize/search/from/to` + filtro por aba `status`/`action`/`severity` e `level` do Log do Sistema); paginação pelo `total`, busca com debounce, `to` como fim do dia. Removidos os filtros/slice no cliente.
- [x] **Relatório de execução — gráfico multi-sinal** — consome `ExecutionDetailDto.Trace` e desenha as séries (corrente/tensão/RPM/temp. etc.) no `SnapshotChart` ao lado do Programado × Real.
- [x] **Programas — paginação no servidor** — `programStore` virou cache por página (search/filter/sort/page/pageSize via `GET /api/programs`, paginação/contagem pelo `total`; clamp em 100). Telas Programas e galeria do Início.
- [x] **Alterações — gráfico do perfil restaurado** — `reportsClient` remonta a curva a partir dos `points` do `GET /api/changes/{id}` (uma curva por mudança: Criado=nova, Editado=atual, Removido=removida; `timeSec` cumulativo). Sumira na migração mock→API.
- [x] **Card "atualização disponível" real** — `GET/POST /api/system/update` na tela Informação (mostra versão atual/disponível; botão "Atualizar" só para Admin); substituiu a simulação.
- [x] **Sino/Notificações reais** — `notifications.ts` virou store via API com polling (`GET /api/notifications` + `unread-count` + `read-all`); badge e tela reais, toast em nova notificação.
- [x] **Ícones Wi-Fi × cabo + globo na TopBar** — `useSystemStatus` faz polling de `GET /api/system/status`: Wi-Fi/cabo por `network.link` e globo por `centralServerOnline`.

- [x] **Cadastro de usuário — senha no formulário** — campos Senha + Confirmar senha (obrigatórios, mín. 8 / máx. 72, qualquer caractere) na criação e "Nova senha" opcional na edição; removido o default `reflow1234` (`users.ts` agora exige a senha enviada). _Obs.: o `reflow1234` que aparece na tela de login é a senha da conta dev semeada, não um default de cadastro._
- [x] **Integração com o backend (.NET)** — substituída a persistência mock em `localStorage` pela **API REST + SignalR**: autenticação real (JWT) + recuperação de senha, Programas/Usuários/Configurações/Calibração via API, **execução ao vivo** (start/stop + telemetria SignalR), leituras ao vivo (BottomBar/Sensores), Relatórios/Diagnóstico/Manutenção lendo dados reais; toasts na resposta da API (`src/lib/api.ts`, `realtime.ts`, `apiStore.ts`, `reportsClient.ts`)
- [x] Upgrade Next 16 / React 19.2 / TS 6 / Tailwind 4 (ESLint fixo em 9.x, flat config) + merge na `develop`
- [x] Tela de monitoramento: TopBar + galeria paginada + BottomBar + Sidebar (drawer + docagem responsiva ≥1280×600)
- [x] Gráfico do perfil de temperatura (SVG próprio, responsivo, auto-compacto)
- [x] Sensores "ao vivo" (mock `useLiveReadings`)
- [x] Layout responsivo: tipografia fluida (`clamp()`), galeria paginada (1 card em 1024×600)
- [x] **Novo Programa**: editor de perfil (pontos Temp/Tempo/Rampa, prévia, Fixo/Parábola), limites centrais
- [x] **Programas**: Ver Gráfico (modal), Editar, Deletar (confirmação + tombstones), Favoritar, busca, Organizar (ordenação), Filtrar por (favoritos/uso), paginação
- [x] **Toasts** (criar/editar/deletar) e persistência local (localStorage)
- [x] **Relatórios** — abas Execuções / Alterações / Erros com busca, filtro por aba e intervalo de datas (react-day-picker)
- [x] **Relatórios — paginação** das tabelas (componente `Pagination` compartilhado; bloco fixo + scroll no 1024×600, responsivo em telas maiores)
- [x] **Relatórios — detalhe de Execução** (overlay): gráfico Programado × Real com marcador da falha, detalhes, comparativo do perfil e timeline de eventos
- [x] **Relatórios — detalhe de Erro** (overlay): snapshot multi-sinal interativo (liga/desliga séries + crosshair/tooltip), programa/ID/usuário, detalhes e eventos
- [x] **Relatórios — detalhe de Alteração** (modal): config (bullets) ou programa (gráfico antes/depois sensível à ação Criado/Editado/Removido + diff de pontos)
- [x] **Configuração** — 5 abas: Geral (PID/forno/processo/tensão + mín/máx), Usuários (CRUD + validação de usuário/e-mail + sub-telas), Rede (teste de ping + IP Fixo desabilitando campos), Notificações (Tipo selecionável), Diagnóstico (leituras ao vivo + autotestes); persistência local
- [x] **Login + permissões** — tela de senha (erro inline, recuperação por e-mail), sessão lembrada, papéis Admin (tudo) / Regular (Início + Programas) com guarda de rota e logout
- [x] **Alterar Tema** — toggle claro/escuro na TopBar
- [x] **TopBar** — usuário logado + papel + cronômetro de sessão ao vivo
- [x] **Informação** — versões/armazenamento/IP em card "Sistema" + um card por placa (Potência/Controle: versão, S/N, horímetro) + logo PandeWilly e QR do repositório
- [x] **Diagnóstico — estatísticas & rankings** — visão geral (programas, execuções, falhas, usuários ativos/inativos, admins), falhas por tipo (barras por severidade) e rankings Top-N editáveis de usuários (logins) e programas (uso)
- [x] **Diagnóstico — sub-abas** — Estatísticas / Sensores (leituras + autotestes) / Manutenção
- [x] **Diagnóstico — Manutenção** — info de sistema (tamanho do banco, espaço livre no HD, SO, versão do Linux), Limpeza do banco (modal com quantidade + tamanho por categoria, respeitando flags em Relatórios/Logs/Estatísticas) e Reset de fábrica (type-to-confirm, deixa 1 admin + 1 programa)
- [x] **INICIAR** — execução ao vivo com 3 gráficos sincronizados (Temperatura c/ perfil esperado de fundo · Tensão+Corrente eixos esq/dir · RPM), crosshair compartilhado, rótulo do valor no fim de cada linha, quadro de leituras fixo, fase/tempo/progresso, parar/concluir; séries configuráveis em Geral → "Gráfico da execução"; simulação real-time mock
- [x] **Calibração** — movida do login secreto isolado (/calibracao) para uma aba em Configurações, visível só para o login técnico (`calibracao`, agora Admin completo); inclui o assistente de calibração da saída (10→50→100→150→0 V, fit de ganho/offset)
- [x] **Tema Light** — tokens semânticos (--border/--surface-2/--surface-inset/--hover) + variante `dark:` por `data-theme`; sidebar/cards/barras/modais com fundo e bordas visíveis no claro, cores de status legíveis

---

Adicionado pelo user

- Erro no frontend: Não foi possível conectar ao servidor... Tipo ta cortando o que esta escrevendo. Deve aparecer um toast com o erro e possiveis soluções para tudo que tem no frontend. Ok?

-[browser] [2026-05-30T16:54:56.462Z] Error: Failed to start the connection: Error: The connection was stopped during negotiation. AO logar aconteceu isso
GET /programas 200 in 66ms (next.js: 48ms, application-code: 18ms)
[browser] [2026-05-30T16:55:36.460Z] Error: Failed to start the connection: Error: The connection was stopped during negotiation.
Ao acessar a pagina de programas tbm

- Quero uma biblioteca de logger no console. É possível mesmo que seja frontend? ja que ele é um serviço? Quero tudo mapeado, qual rota acessou, quem logou, se deu erro, qual erro especificado, tudo de relevante.

- No sidebar indormação de temperatura tensão e corrente, esta exibindo trocentas casas decimais. Quero que vc limite para uma apenas

- Vc em algum instante deve ter mexido na tela de relatórios - alterações. Lembra que quando oc ara mexe no programa deve ser exibido o grafico do antes e depois? Vc tinha feito isso antes. Talvez seja uma integração com o backend?

- RPM sem casa decimal

- Vc deve limitar a escrita e até mesmo se o cara colar pelo min e max do campo. Além disso se houver campo que é só numero, deve permitir só escrever numero e pelo CTRL+V tbm.

- No relatório de execução tbm quero no grafico informação de corrente tensão, rpm, temperatura dissipador, tudo...

- Tamanho do banco de dados
  741 KB
  hard_drive
  Espaço livre no HD
  12.4 GB de 32 GB (39%)
  Esses valores são reais? Quero dizer, ele realmente pega do backend essa info?

- Pelo que parece na tela de Programas, ele requsita tods os programas (deve acontecer em relatoprios)? Isso não é um problema se tiver +1k de dados?

- Deve ser guardado no BD as preferencias do usuário: tipo se o Admin quer a tela mais clara, ao logar em outro pc ou na proxima vez deve saber disso. Bem como quais leegendas devem estar na vizualição da execução....

- Uma coisa que ainda não tem usuabilidade é o Top BAR. La tem o icone do WIFI para quando tiver conectado via Wifi, se for cabo deve apresentador do cabo

- Em Rede se pode fazer um menu para seleção da rede prioritaria e configuração da rede cabeada, E tipo no teste do ping, acho que ficou faltando adicionar a porta para teste.

- O icone do mundo é para quando ele estiver conectado ao servidor central (ainda não implementado)
- Além disso em informações talvez, se houver uma atualizaão nova do programa deve aparecer ali a nova versão e o botão pra atualizar, podemos simular depois

- O do sino com um numero 3 em cima é referente à notificações não vizualizadas. Então o usuário deve ir até a tela de Notificações para ver o que há la, pode ser atualização nova disponivel, Algum erro que ocorreu. E quando houver nova notificação teve ter o toast

- Quando tiver pouco espaço no HD, informar ao cliente por email e algum aviso na tela para ele apagar relatorios antigos.

-Cade o log pea quando usa set,update. Além disso queria colocar as informações do get e do set. Tipo que dado retornou, que dado setou...

- Qual a divuldade de implementar o GraphQL?

---

Validação

GET / 200 in 255ms (next.js: 108ms, application-code: 148ms)
[browser] 14:53:44.935 [system] failed to fetch status ApiError: Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.
at ApiError (src/lib/api.ts:28:5)
at request (src/lib/api.ts:69:11)
26 | readonly status: number;
27 | constructor(status: number, message: string) {

> 28 | super(message);

     |     ^

29 | this.name = "ApiError";
30 | this.status = status;
31 | } (src/lib/logger.ts:45:62)
[browser] 14:53:44.935 [notifications] Falha ao buscar notificações. ApiError: Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.
at ApiError (src/lib/api.ts:28:5)
at request (src/lib/api.ts:69:11)
26 | readonly status: number;
27 | constructor(status: number, message: string) {

> 28 | super(message);

     |     ^

29 | this.name = "ApiError";
30 | this.status = status;
31 | } (src/lib/logger.ts:45:62)
[browser] 14:53:44.935 [programStore] Falha ao carregar programas ApiError: Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.
at ApiError (src/lib/api.ts:28:5)
at request (src/lib/api.ts:69:11)
26 | readonly status: number;
27 | constructor(status: number, message: string) {

> 28 | super(message);

     |     ^

29 | this.name = "ApiError";
30 | this.status = status;
31 | } (src/lib/logger.ts:45:62)
[browser] 14:53:44.940 [notifications] Falha ao buscar notificações. ApiError: Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.
at ApiError (src/lib/api.ts:28:5)
at request (src/lib/api.ts:69:11)
26 | readonly status: number;
27 | constructor(status: number, message: string) {

> 28 | super(message);

     |     ^

29 | this.name = "ApiError";
30 | this.status = status;
31 | } (src/lib/logger.ts:45:62)
[browser] 14:53:44.944 [programStore] Falha ao carregar programas ApiError: Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.
at ApiError (src/lib/api.ts:28:5)
at request (src/lib/api.ts:69:11)
26 | readonly status: number;
27 | constructor(status: number, message: string) {

> 28 | super(message);

     |     ^

29 | this.name = "ApiError";
30 | this.status = status;
31 | } (src/lib/logger.ts:45:62)
[browser] 14:53:46.098 [programStore] Falha ao carregar programas ApiError: Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.
at ApiError (src/lib/api.ts:28:5)
at request (src/lib/api.ts:69:11)
26 | readonly status: number;
27 | constructor(status: number, message: string) {

> 28 | super(message);

     |     ^

29 | this.name = "ApiError";
30 | this.status = status;
31 | } (src/lib/logger.ts:45:62)
[browser] 14:53:47.273 [programStore] Falha ao carregar programas ApiError: Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.
at ApiError (src/lib/api.ts:28:5)
at request (src/lib/api.ts:69:11)
26 | readonly status: number;
27 | constructor(status: number, message: string) {

> 28 | super(message);

     |     ^

29 | this.name = "ApiError";
30 | this.status = status;
31 | } (src/lib/logger.ts:45:62)
[browser] 14:54:04.908 [system] failed to fetch status ApiError: Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.
at ApiError (src/lib/api.ts:28:5)
at request (src/lib/api.ts:69:11)
26 | readonly status: number;
27 | constructor(status: number, message: string) {

> 28 | super(message);

     |     ^

29 | this.name = "ApiError";
30 | this.status = status;
31 | } (src/lib/logger.ts:45:62)
[browser] 14:54:14.964 [notifications] Falha ao buscar notificações. ApiError: Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.
at ApiError (src/lib/api.ts:28:5)
at request (src/lib/api.ts:69:11)
26 | readonly status: number;
27 | constructor(status: number, message: string) {

> 28 | super(message);

     |     ^

29 | this.name = "ApiError";
30 | this.status = status;
31 | } (src/lib/logger.ts:45:62)

Aparece um toast "Não foi possivel conectar ao servidor" porém aparece com um ticado verde ao inves de um X significando que é um erro.

Na vdd todos os erros estão exibindo o ticado verde + mensagem. Tem que aparecer um X

Tem um bug não sei se é no front ou backend. No relatório de execução. Tem um programa que foi parado por falha, porém no log consta Execução abortada. Neste caso deveria trocar o erro por abaortado (bem como o icone) (/home/lsilva/Pictures/2026-05-31_15-05.png/)

Teste do ping o textfield de HOST/iP esta deslainhado com o POrta (2026-05-31_15-08.png)

Icone do WiFi zoado (2026-05-31_15-11.png)

Na Execução do programa. Deve mostrar o motivo da Falha. Tipo coloca Falha, mas não diz porque. Além disso, se é uma falha seria legal ter um link para o Relatórios de erros

- O grafico do antes e depoois esta bem errado:
  1° Ele não esta pegando a ultima modificaçao no relatórios de alteração (no grafico eu digo, o que esta escrito ta ok).
  2° 2026-05-31_15-16.png A ideia do gráfico de baixo deveria estar no gráfico de cima. Ou seja, no gráfico de cima que quero habilitar/desabilitar a vizualisação e o la de baixo nem precisa existir. E tipo o grafico atual fica a linha continua e os outros em tracejado. O que acha?
  3° aaaaaaa.png Refaz esse layout ta bem feio. Tipo pega meu exemplo la do Figma e atua em cima.
  4° Tipo tenho um programa que foi alterado 3x. Se ele abrir o relatório de modificação da última alteração realizada, neste relatório deve apresentar as outras modificações. Dai tipo se arruma por data no relatório, sei la,... Dai por exemplo se ele abrir a penultima, não deve estar nesse relatorio a ultima, saca?
  Sugestão de melhoria:
  Eu proporia trocar o JSON atual, que mistura changed-before e changed-after como itens separados, por um modelo de diff estruturado.
  A ideia é: cada ponto aparece uma única vez, com before, after, status e changedFields.
  {
  "id": "bc98dc10-fe3f-4567-b5ff-a802adfe773a",
  "at": "2026-05-31T18:15:10.898409+00:00",
  "action": "Editado",
  "target": "Testetes",
  "userName": "lucas.silva",
  "programId": "bab1bb26-482d-4e01-8756-36fee06ee741",
  "detailKind": "program",

  "summary": {
    "totalChanges": 4,
    "added": 2,
    "removed": 0,
    "changed": 2,
    "unchanged": 2,
    "changedFields": {
      "temp": 0,
      "timeSec": 0,
      "ramp": 2
    }
  },

  "diff": {
    "before": {
      "pointCount": 4,
      "points": [
        {
          "index": 1,
          "temp": 150,
          "timeSec": 60,
          "ramp": "Linear"
        },
        {
          "index": 2,
          "temp": 180,
          "timeSec": 90,
          "ramp": "Fixo"
        },
        {
          "index": 3,
          "temp": 260,
          "timeSec": 120,
          "ramp": "Linear"
        },
        {
          "index": 4,
          "temp": 200,
          "timeSec": 150,
          "ramp": "Linear"
        }
      ]
    },

    "after": {
      "pointCount": 6,
      "points": [
        {
          "index": 1,
          "temp": 150,
          "timeSec": 60,
          "ramp": "Linear"
        },
        {
          "index": 2,
          "temp": 180,
          "timeSec": 90,
          "ramp": "Fixo"
        },
        {
          "index": 3,
          "temp": 260,
          "timeSec": 120,
          "ramp": "Parábola negativa"
        },
        {
          "index": 4,
          "temp": 200,
          "timeSec": 150,
          "ramp": "Parábola positiva"
        },
        {
          "index": 5,
          "temp": 200,
          "timeSec": 180,
          "ramp": "Linear"
        },
        {
          "index": 6,
          "temp": 200,
          "timeSec": 210,
          "ramp": "Linear"
        }
      ]
    },

    "changes": [
      {
        "index": 1,
        "status": "unchanged",
        "before": {
          "temp": 150,
          "timeSec": 60,
          "ramp": "Linear"
        },
        "after": {
          "temp": 150,
          "timeSec": 60,
          "ramp": "Linear"
        },
        "changedFields": []
      },
      {
        "index": 2,
        "status": "unchanged",
        "before": {
          "temp": 180,
          "timeSec": 90,
          "ramp": "Fixo"
        },
        "after": {
          "temp": 180,
          "timeSec": 90,
          "ramp": "Fixo"
        },
        "changedFields": []
      },
      {
        "index": 3,
        "status": "changed",
        "before": {
          "temp": 260,
          "timeSec": 120,
          "ramp": "Linear"
        },
        "after": {
          "temp": 260,
          "timeSec": 120,
          "ramp": "Parábola negativa"
        },
        "changedFields": ["ramp"]
      },
      {
        "index": 4,
        "status": "changed",
        "before": {
          "temp": 200,
          "timeSec": 150,
          "ramp": "Linear"
        },
        "after": {
          "temp": 200,
          "timeSec": 150,
          "ramp": "Parábola positiva"
        },
        "changedFields": ["ramp"]
      },
      {
        "index": 5,
        "status": "added",
        "before": null,
        "after": {
          "temp": 200,
          "timeSec": 180,
          "ramp": "Linear"
        },
        "changedFields": ["point"]
      },
      {
        "index": 6,
        "status": "added",
        "before": null,
        "after": {
          "temp": 200,
          "timeSec": 210,
          "ramp": "Linear"
        },
        "changedFields": ["point"]
      }
    ]
  }
}

o Botão de notificação, não sei se vc terminou ainda, mas a ideia é eu clicar nele e exibir as notificações ignoradas sei la. Pra que ele pode existir?


- 2026-05-31_15-31.png Quando a senha ta salva no firefox e clico pra usar ela o fundo fica branco.

- Na execução, possivelmente em todos os modals. Se a tela é maior não tem porque limitar o tamanho (2026-05-31_15-55.png)
- Na tela de login, não ter o botão de trocar o tema, até pq não faz sentido 
- No usuario vanessa (regular) ao iniciar o programa esta dando erro 403 ([15:59:17 INF] Request and Response:
Method: OPTIONS
PathBase: 
Path: /api/runs/start
QueryString: 
StatusCode: 204
Duration: 0.0289
[15:59:17 INF] HTTP OPTIONS /api/runs/start responded 204 in 0.0607 ms
[15:59:17 INF] Request and Response:
Method: POST
PathBase: 
Path: /api/runs/start
QueryString: 
StatusCode: 403
RequestBody: 
RequestBodyStatus: [Not consumed by app]
Duration: 0.3173
[15:59:17 INF] HTTP POST /api/runs/start responded 403 in 0.3668 ms)

- Um erro muito tosco, tipo to só favoritando ou desfavoritando e ta mandando todo o programa pro branco

StatusCode: 200
ResponseBody: {"items":[{"id":"bab1bb26-482d-4e01-8756-36fee06ee741","name":"Testetes","runCount":2,"lastUsed":"2026-05-31T18:57:25.735818+00:00","profile":[{"t":0,"temp":25},{"t":60,"temp":150},{"t":90,"temp":150},{"t":92.5,"temp":167.56944444444446},{"t":95,"temp":183.61111111111111},{"t":97.5,"temp":198.125},{"t":100,"temp":211.11111111111111},{"t":102.5,"temp":222.56944444444446},{"t":105,"temp":232.5},{"t":107.5,"temp":240.90277777777777},{"t":110,"temp":247.77777777777777},{"t":112.5,"temp":253.125},{"t":115,"temp":256.94444444444446},{"t":117.5,"temp":259.2361111111111},{"t":120,"temp":260},{"t":122.5,"temp":259.5833333333333},{"t":125,"temp":258.3333333333333},{"t":127.5,"temp":256.25},{"t":130,"temp":253.33333333333334},{"t":132.5,"temp":249.58333333333334},{"t":135,"temp":245},{"t":137.5,"temp":239.58333333333331},{"t":140,"temp":233.33333333333334},{"t":142.5,"temp":226.25},{"t":145,"temp":218.33333333333331},{"t":147.5,"temp":209.58333333333334},{"t":150,"temp":200},{"t":180,"temp":200},{"t":210,"temp":200}],"segments":[{"temp":150,"durationSec":60,"ramp":"Linear"},{"temp":180,"durationSec":30,"ramp":"Fixo"},{"temp":260,"durationSec":30,"ramp":"Parábola negativa"},{"temp":200,"durationSec":30,"ramp":"Parábola positiva"},{"temp":200,"durationSec":30,"ramp":"Linear"},{"temp":200,"durationSec":30,"ramp":"Linear"}],"favorite":true},{"id":"gen-33","name":"SMD 144ºC","runCount":34,"lastUsed":"2026-09-05T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":75,"temp":79},{"t":158,"temp":101},{"t":207,"temp":122},{"t":233,"temp":144},{"t":271,"temp":115},{"t":323,"temp":65},{"t":376,"temp":40}],"favorite":true},{"id":"gen-20","name":"Sem Chumbo 263ºC","runCount":38,"lastUsed":"2026-08-20T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":65,"temp":145},{"t":137,"temp":184},{"t":180,"temp":224},{"t":203,"temp":263},{"t":235,"temp":210},{"t":281,"temp":118},{"t":327,"temp":40}],"favorite":true},{"id":"gen-44","name":"Sem Chumbo 161ºC","runCount":16,"lastUsed":"2026-08-16T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":64,"temp":89},{"t":134,"temp":113},{"t":175,"temp":137},{"t":198,"temp":161},{"t":230,"temp":129},{"t":274,"temp":72},{"t":319,"temp":40}],"favorite":true},{"id":"gen-8","name":"Pré-aquec. 229ºC","runCount":49,"lastUsed":"2026-08-08T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":66,"temp":126},{"t":139,"temp":160},{"t":182,"temp":195},{"t":205,"temp":229},{"t":238,"temp":183},{"t":285,"temp":103},{"t":331,"temp":40}],"favorite":false},{"id":"gen-32","name":"Pré-aquec. 127ºC","runCount":27,"lastUsed":"2026-08-04T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":65,"temp":70},{"t":136,"temp":89},{"t":178,"temp":108},{"t":200,"temp":127},{"t":233,"temp":102},{"t":278,"temp":57},{"t":323,"temp":40}],"favorite":false},{"id":"gen-19","name":"QFN 246ºC","runCount":31,"lastUsed":"2026-07-19T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":119,"temp":135},{"t":249,"temp":172},{"t":327,"temp":209},{"t":368,"temp":246},{"t":428,"temp":197},{"t":511,"temp":111},{"t":594,"temp":40}],"favorite":true},{"id":"gen-43","name":"QFN 144ºC","runCount":9,"lastUsed":"2026-07-15T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":117,"temp":79},{"t":246,"temp":101},{"t":322,"temp":122},{"t":363,"temp":144},{"t":422,"temp":115},{"t":504,"temp":65},{"t":586,"temp":40}],"favorite":true},{"id":"gen-7","name":"Teste 212ºC","runCount":42,"lastUsed":"2026-07-07T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":120,"temp":117},{"t":251,"temp":148},{"t":329,"temp":180},{"t":371,"temp":212},{"t":431,"temp":170},{"t":514,"temp":95},{"t":598,"temp":40}],"favorite":false},{"id":"gen-31","name":"Teste 110ºC","runCount":20,"lastUsed":"2026-07-03T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":118,"temp":61},{"t":248,"temp":77},{"t":324,"temp":94},{"t":366,"temp":110},{"t":425,"temp":88},{"t":507,"temp":50},{"t":590,"temp":40}],"favorite":false},{"id":"gen-18","name":"BGA 229ºC","runCount":24,"lastUsed":"2026-06-18T00:00:00+00:00","profile":[{"t":0,"temp":25},{"t":108,"temp":126},{"t":227,"temp":160},{"t":298,"temp":195},{"t":335,"temp":229},{
Duration: 8.0931
[16:00:22 INF] HTTP GET /api/programs responded 200 in 8.1381 ms
Deveteria ter um post pra favoritar/desfavoritar usando o id, mesma coisa para o deletar

Se eu aperto CTRL+F5 na pagina de programas ele aparece varios toast de Execução abortada
Usuario dev apenas, tipo dev.pandewilly - senha pandewilly - Na tela de Diagnosticos eu quero uma nova TAB com log. Onde tipo tem uma quadrado com o log em tempo real, por exemplo. Front enviou get solicitando status. Servidor retornou get com resposta... Esse log é apenas visivel no browser sem limite. POis quando fechar o browser ja era. Ou deixa um limite de 1000 linhas o que acha?

Se tiver tarefas para passar aoi backend, vc ja sabe o procedimento  e escreva o jeito que vc espera que ele faça e devolta de resultado.

Escreva para o backend no TODO dele para simular uma atualização do HTML, como ele faria isso, e tbm do backend? Pede pra ele escrever sugestões de como ele faria. Futuramente, talvez seja o STM32.

Ao editar um programa e clicar em Salvar ele não sai da tela, apenas desabilita o botão de salvar, ja que não tem mais nada para salvar

- To criando um usuario

Duration: 2.6032
[16:18:00 INF] HTTP GET /api/notifications responded 200 in 2.6987 ms
[16:18:09 INF] Request and Response:
Method: OPTIONS
PathBase: 
Path: /api/auth/logout
QueryString: 
StatusCode: 204
Duration: 0.0525
[16:18:09 INF] HTTP OPTIONS /api/auth/logout responded 204 in 0.1411 ms
[16:18:09 INF] Logout: 'lucas.silva'.
[16:18:09 INF] Request and Response:
Method: POST
PathBase: 
Path: /api/auth/logout
QueryString: 
StatusCode: 204
Duration: 8.5194
[16:18:09 INF] HTTP POST /api/auth/logout responded 204 in 8.5615 ms
[16:18:09 INF] Request and Response:
Method: GET
PathBase: 
Path: /hubs/diagnostics
QueryString: ?id=mkWOs99D91M_RCQX2LzBHQ&access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5YzQ5MmUwNy1iNjVkLTRmY2MtOGQ3Mi1mNjg0MjBiNTBkMDkiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoibHVjYXMuc2lsdmEiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pbiIsImlhdCI6MTc4MDI1NTA0OCwibmJmIjoxNzgwMjU1MDQ4LCJleHAiOjE3ODAyODM4NDgsImlzcyI6InJlZmxvdy1vdmVuIiwiYXVkIjoicmVmbG93LW92ZW4tdWkifQ.nsqWbY5jnqFE148fGTidgH7kO3GgkWk8YuuXLHj3kQc
StatusCode: 101
E quando tento acessar ele com a senha que criei, ele da erro. Além disso esse lucas.2 quando cloiquei pra adicioanr esse usuario, tipo antes de fechar a o modal, parece que ele apareceu um erro no campo do nome dizendo que o usuario ja existe. (tipo parece que a resposta ja retorna do servidor antes de fechar o modal)