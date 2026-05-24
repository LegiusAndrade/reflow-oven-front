# TODO — Reflow Oven UI

Roadmap da interface. (Também espelhado no task list da sessão do Claude Code.)

## Em andamento

- [ ] **Gráfico do perfil de temperatura** no card central da tela inicial — curva
      temperatura × tempo do programa selecionado.
      _Primeira versão pronta; afinando tamanhos de fonte (mínimo = texto "Execuções")._

## Próximas

- [ ] **Refinar o menu/Sidebar como drawer** — fechar com ESC, foco/acessibilidade,
      indicar item ativo e revisar a animação.
- [ ] **Mock de leituras "ao vivo"** — simular sensores variando no tempo (ex.: hook
      `useLiveReadings`) para ver a régua da BottomBar em ação antes do RS422 real.
- [ ] **Demais telas do Figma** — Programas (lista/busca), Relatórios
      (Execuções/Alterações/Erros), Configurações (Geral/Usuário/Rede/Notificação),
      Detalhes de Execução. Reusar TopBar, BottomBar, Sidebar e os tokens.

## Feito

- [x] Upgrade Next 16 / React 19.2 / TS 6 / Tailwind 4.3 (ESLint fixo em 9.x, flat config)
- [x] Merge do upgrade na `develop`
- [x] Tela inicial/monitoramento: TopBar + carrossel + BottomBar (sensores) + Sidebar como drawer
- [x] `DeviceFrame` 1024×600 com auto-escala (pixel-perfeito no device, escala no note)
