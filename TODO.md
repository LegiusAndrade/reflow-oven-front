# TODO — Frontend (reflow-oven)

Roadmap da interface. Notas técnicas pontuais usam o marcador `TODO(backend)` no código
(`grep -rn "TODO(backend)" src/`). Tarefas que dependem do backend vão para `../reflow-oven-backend/TODO.md`.

> **Status (2026-05-31):** base pronta (monitoramento, programas, relatórios, configurações,
> login/perfis) e integrada ao backend real (.NET + SignalR, JWT). Em andamento: o lote de
> **Bugs — Validação 2026-05-31** abaixo. As capturas referenciadas estão em `~/Pictures/`.

## Bugs — Validação 2026-05-31 (em triagem)

Os 8 primeiros estão sob investigação por um workflow de triagem (raiz + arquivos + correção).

### UI / toasts

1. [~] **Toasts de erro com ícone errado** — todo erro mostrava o "check" verde; deve ser um **X**
   vermelho. _Correção aplicada:_ as 22 chamadas `showToast(...)` de falha passaram a usar `"error"`
   e o ícone do tipo `error` no `Toaster` virou `cancel` (círculo com X). _Validar na tela._
2. [ ] **Spam do toast "Não foi possível conectar ao servidor"** — com o servidor fora, várias
   chamadas (status / notificações / programas) disparam o mesmo toast repetido (ver logs colados).
   Agrupar/limitar: um único toast enquanto estiver offline (dedupe por mensagem numa janela de tempo).
   Idealmente a mensagem deveria trazer também **possíveis soluções**.
3. [ ] **CTRL+F5 na tela de Programas → vários toasts "Execução abortada"** — disparo em massa ao
   recarregar; provavelmente o hub de telemetria reemite eventos antigos ao reconectar. Suprimir.
4. [ ] **SignalR: "The connection was stopped during negotiation"** — ocorre ao logar e ao acessar
   Programas. Investigar o ciclo de vida da conexão (`realtime.ts`) vs. troca de rota/token.

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

8. [ ] **Ping: campo HOST/IP desalinhado com o campo Porta.** (`2026-05-31_15-08.png`) — aba Rede.
9. [ ] **Ícone de WiFi "zoado".** (`2026-05-31_15-11.png`)
10. [ ] **Botão de notificação (sino):** ao clicar, levar à tela de Notificações (atualização nova,
    erros, etc.); o badge "3" são as não vistas. Definir/concluir o comportamento do clique.

### Programas / execução

11. [ ] **Favoritar/desfavoritar recarrega o programa todo (pisca "branco")** — só alternar o favorito
    está reenviando/recarregando o programa inteiro. Deve haver um **POST dedicado de favoritar/
    desfavoritar por id** (idem para deletar por id), sem refetch da lista inteira. _(Pode ter parte
    no backend; ver TODO do backend.)_
12. [ ] **Editar programa + Salvar não sai da tela** — apenas desabilita o botão; deveria navegar de
    volta para a lista após salvar (como no "Criar"). _(Pode ter regressado com a checagem `totalSec > 0`.)_
13. [ ] **Usuário `vanessa` (Regular) recebe 403 ao iniciar programa** (`POST /api/runs/start` → 403).
    Definir se Regular pode executar; se sim, é permissão no backend; se não, esconder/bloquear no front.
14. [ ] **Criação de usuário com problemas** — (a) o erro "usuário já existe" aparece no campo **antes**
    de fechar o modal (resposta do servidor chega antes do fechamento); (b) **não consigo logar** com a
    senha que criei. Investigar o fluxo de criação + hash/login. _(Provável backend; ver TODO do backend.)_

### Diversos

15. [ ] **Firefox: ao usar a senha salva, o fundo do campo fica branco.** (`2026-05-31_15-31.png`)
    Estilizar o estado `:-webkit-autofill`/autofill para respeitar o tema.
16. [ ] **Modais limitam largura em telas grandes sem necessidade** (`2026-05-31_15-55.png`) — na
    execução e provavelmente em todos os modais; soltar o `max-w` quando a tela é maior.
17. [ ] **Tela de login não deveria ter o botão de trocar tema** — não faz sentido ali.
18. [ ] **Limitar escrita e colagem pelos `min`/`max` do campo** — campos numéricos só aceitam números
    (inclusive via CTRL+V). Auditar os inputs (centralizar em um helper/limites de `lib/limits.ts`).
19. [ ] **Casas decimais** — confirmar que a BottomBar/sidebar mostra **1 casa** para temperatura/
    tensão/corrente e **0** para RPM (relatos antigos; validar se ainda ocorre).
20. [ ] **Nova aba "Log" em Diagnóstico (somente login dev)** — quadro com log em tempo real no browser
    (ex.: "Front pediu status → Servidor respondeu ..."), só visível no browser (some ao fechar) ou com
    teto de ~1000 linhas. Visível para o usuário dev (`dev.pandewilly` / `pandewilly`). _(Há `logger.ts`;
    falta a aba/visualizador.)_

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
