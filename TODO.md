# TODO — Reflow Oven UI

Roadmap da interface. Notas técnicas pontuais usam o marcador `TODO(backend)` no código
(`grep -rn "TODO(backend)" src/`).

## Relatórios (continuar)

- [ ] **Paginação** nas tabelas (Execuções / Alterações / Erros), no mesmo estilo da paginação dos cards/gráficos.
- [ ] **Execuções** — clicar no gráfico da linha abre a tela de detalhe da execução: **Report Detail Exec** (Figma).
- [ ] **Alterações** — adicionar botão **Detalhe** que abre **Example Change Config** ou **Example Change Program** (Figma).
- [ ] **Erros** — adicionar botão de detalhe que abre **Report Detail Error** (Figma).

## Próximas

- [ ] **INICIAR** (card da tela inicial) — ligar o botão à execução de um programa.
- [ ] **Alterar Tema** (sidebar) — toggle claro/escuro (hoje é placeholder).
- [ ] **Configuração** — tela real (hoje stub / ComingSoon).
- [ ] **Informação** — tela real (hoje stub / ComingSoon).

## Integração com o backend

- [ ] Disparar as **toasts** na resposta da API (sucesso/erro), não logo após a escrita local.
- [ ] Substituir a persistência em **localStorage** (`src/lib/programStore.ts`) pela API/RS422.

## Feito

- [x] Upgrade Next 16 / React 19.2 / TS 6 / Tailwind 4 (ESLint fixo em 9.x, flat config) + merge na `develop`
- [x] Tela de monitoramento: TopBar + galeria paginada + BottomBar + Sidebar (drawer + docagem responsiva ≥1280×600)
- [x] Gráfico do perfil de temperatura (SVG próprio, responsivo, auto-compacto)
- [x] Sensores "ao vivo" (mock `useLiveReadings`)
- [x] Layout responsivo: tipografia fluida (`clamp()`), galeria paginada (1 card em 1024×600)
- [x] **Novo Programa**: editor de perfil (pontos Temp/Tempo/Rampa, prévia, Fixo/Parábola), limites centrais
- [x] **Programas**: Ver Gráfico (modal), Editar, Deletar (confirmação + tombstones), Favoritar, busca, Organizar (ordenação), Filtrar por (favoritos/uso), paginação
- [x] **Toasts** (criar/editar/deletar) e persistência local (localStorage)
- [x] **Relatórios** — abas Execuções / Alterações / Erros com busca, filtro por aba e intervalo de datas (react-day-picker)
