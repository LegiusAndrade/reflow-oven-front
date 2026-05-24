# TODO — Reflow Oven UI

Roadmap da interface. (Também espelhado no task list da sessão do Claude Code.)

## Próximas

- [ ] **Refinar o menu/Sidebar como drawer** — fechar com ESC, foco/acessibilidade e
      indicar o item ativo. (animação hambúrguer⇄X, posição, tamanho e alinhamento ao topo já feitos)
- [ ] **Ação do botão "Iniciar"** — hoje o botão é visual; ligar à execução de um programa.
- [ ] **Demais telas do Figma** — Programas (lista/busca), Relatórios
      (Execuções/Alterações/Erros), Configurações (Geral/Usuário/Rede/Notificação),
      Detalhes de Execução. Reusar TopBar, BottomBar, Sidebar e os tokens.

## Feito

- [x] Upgrade Next 16 / React 19.2 / TS 6 / Tailwind 4.3 (ESLint fixo em 9.x, flat config)
- [x] Merge do upgrade na `develop`
- [x] Tela de monitoramento: TopBar + galeria de programas + BottomBar + Sidebar (drawer)
- [x] Gráfico do perfil de temperatura (SVG próprio, responsivo, auto-compacto)
- [x] Sensores "ao vivo" (mock `useLiveReadings`)
- [x] Menu animado (hambúrguer⇄X), itens no topo, largura fluida
- [x] Layout **responsivo de verdade**: tipografia fluida (`clamp()` no `@theme`), galeria
      **paginada** (1 card em 1024×600; +colunas conforme a largura, +linhas conforme a
      altura) — sem zoom/`DeviceFrame`
