# TODO — Reflow Oven UI

Roadmap da interface. Notas técnicas pontuais usam o marcador `TODO(backend)` no código
(`grep -rn "TODO(backend)" src/`).

## Próximas

> O backend já fechou os itens A–H (ver `../reflow-oven-backend/TODO.md`), então estes deixaram de
> estar bloqueados — agora é trabalho de front consumir os novos endpoints/contratos.
- [ ] **Persistir tema + séries do gráfico por usuário** — consumir `GET/PUT /api/me/preferences` (item **A**); hidratar o tema no boot via `/api/auth/me`/login (hoje o tema só vive na sessão).
- [ ] **Aba Rede** — listar interfaces (`GET /api/system/interfaces`), escolher a prioritária (`POST /api/system/interfaces/priority`) e enviar a **porta** no teste de ping (item **B**); migrar a config para `/api/system/*`.
- [ ] **Gráfico do relatório de execução multi-sinal** (corrente/tensão/RPM/temp. dissipador) — consumir `ExecutionDetailDto.Trace` (item **C**).
- [ ] **Aviso de pouco espaço em disco** — o backend já notifica (sino + e-mail, item **D**); confirmar que aparece bem na tela (o feed real do sino já chega).
- [ ] **Alterações — antes × depois numa edição** — o backend vai passar a gravar a curva anterior (`changed-before`) além da `changed-after` no `UpdateAsync`. O `reportsClient` **já está preparado** (particiona por `role` e preenche `beforeProfile` quando `changed-before` aparece → o `ChangeDetail` liga o overlay sozinho). **Validar** assim que o backend publicar: confirmar que o `role` vem exatamente `"changed-before"`/`"changed-after"` e que as duas curvas aparecem.

### Pedidos novos (2026-05-31)
- [ ] **Editor de programa — limite de 100 pontos + contador + tempo total** — hoje o limite é **30** (`PROFILE_MAX_POINTS` no front e `ProfileMaxPoints` no backend). Subir para **100** (precisa mudar **os dois** — o backend valida `req.Segments.Count > ProfileMaxPoints` e rejeita). Na tela de criação/edição mostrar um contador **`x/100 pontos`** ao lado do botão "Adicionar Ponto" e o **tempo total** do perfil (soma das durações dos segmentos). _(o cap continua centralizado em `limits.ts`)_
- [ ] **Relatórios — histórico de edições de um programa** — o backend guarda as últimas **N** edições por programa (`ChangeRetentionPerProgramMax`) e o `GET /api/changes` aceita `programId`. Na Alteração de um programa, listar as datas das edições (legendas) e deixar o usuário **ticar quais** quer ver sobreposto no gráfico de mudança (multi-curva, cada edição com sua cor). _(depende do antes×depois acima para ter as curvas por edição)_
- [ ] **Informação — carga da CPU (%)** — o backend já expõe `SystemMetricsDto.CpuLoadPercent` (média dos núcleos do OrangePi). Falta o front: adicionar `api.systemMetrics()` (ou usar `status.metrics`) e mostrar a CPU % no card "Sistema" da tela Informação (junto de armazenamento/firmware), idealmente com polling leve.

## Feito

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

- Quero uma biblioteca de logger no console. É possível mesmo que seja front end? ja que ele é ums erviço? Quero tudo mapeado, qual rota acessou, quem logou, se deu erro, qual erro especificado, tudo de relevante.

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
