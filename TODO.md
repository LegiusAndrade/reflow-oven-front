# TODO — Reflow Oven UI

Roadmap da interface. Notas técnicas pontuais usam o marcador `TODO(backend)` no código
(`grep -rn "TODO(backend)" src/`).

## Próximas

- [ ] **Cadastro de usuário** — adicionar campo de senha no formulário (hoje novos usuários recebem a senha padrão `reflow1234`).
- [ ] **Alterações (auditoria)** — diff detalhado de programa no overlay (o backend grava um diff simplificado; o overlay mostra listas adicionado/removido).
- [ ] Persistir o **tema** escolhido (hoje só na sessão).

## Feito

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
