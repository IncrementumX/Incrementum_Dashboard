# Issues — flags abertas e pendências

> Lista viva de coisas em aberto. Quando resolvido, marcar `[x]` e adicionar nota de fechamento.

## Build

- [ ] **Eduardo subir arquivos de philosophy/framework** para `../wiki/philosophy/` e `../wiki/framework/`. Os SKILL.md do analista e do associate serão refinados depois disso.
- [ ] **CLAUDE.md operacional iterar** — começamos minimal em `governance/CLAUDE.md`; iteramos com Eduardo conforme padrões aparecem.
- [ ] **Modelo Excel (`incrementum-model`)** — Eduardo define estrutura (template parado em março).

## Briefing

- [ ] **Login nos sites paywalled** no Mac 24/7 (Chrome) — Valor, Estadão, Brazil Journal, Pipeline, NeoFeed, WSJ, Barron's. Cobre leitura humana; automação requer Valyu/Perplexity/FMP.
- [ ] **Implementar nova spec (BuildContext v8 §7)** na skill `incrementum-briefing` que vive no Claude app de Eduardo.

## Dashboard (escopo separado, branch separada)

- [x] Net contributions — corrigido (Eduardo confirmou em 2026-04-25).
- [x] Portfólio puxando shorts e puts — corrigido (Eduardo confirmou em 2026-04-25).

## Atlas (evolutivo)

- [ ] Estrutura do manual operacional — definir seções com Eduardo.
- [ ] Teses de portfólio: entram em `../wiki/teses/` primeiro, migram pro Atlas quando maduras.

## Conectores / V1.5

- [ ] Plugins e conectores: Valyu, Perplexity, FMP — quais entram em V1.5 (próxima conversa).
- [ ] Scout: revisitar após V1 estável.

## Futuro (deixar pra depois)

- [ ] Agentes em Telegram — fica por último.

## Build env

- [ ] `claude-mem` instalado em 2026-04-25 (Eduardo confirmou). Validar funcionamento depois de algumas sessões.
- [ ] `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — setar quando for ativar agent teams.
- [ ] Obsidian vault: apontar para `../wiki/` quando Eduardo quiser começar a editar pelo Obsidian.

## Pendência: referências ao state.md vs Dashboard

- [x] Resolvido em 2026-04-25: `governance/CLAUDE.md` e `skills/incrementum-analista/SKILL.md` agora deixam claro que `state.md` é o **espelho** que os agentes leem, e que o Dashboard (`src/`) é a fonte canônica. Estrutura state.md ↔ Dashboard (como popular state.md a partir do Dashboard) fica em aberto até a integração ser definida.

## Pendência: surface dos agentes nos clientes Claude

Os perfis dos agentes hoje vivem como SKILL.md em `IncrementumOS/skills/`. São documentação,
não invocáveis automaticamente. Para Eduardo acessar `incrementum_analista` e
`incrementum_associate` no dia a dia:

- [ ] **Claude Code** (VS Code add-in): criar `.claude/agents/incrementum-analista.md` e
  `.claude/agents/incrementum-associate.md` com frontmatter de subagente, derivados
  dos SKILL.md correspondentes. PR separado: `feat: surface agents in Claude Code`.
- [ ] **Claude.ai (web/desktop)**: subir cada agente como Project Skill no projeto
  Incrementum (manual via UI, mesmo fluxo que Eduardo já usou para a skill de briefing).
  Claude pode formatar o conteúdo pronto para colar.
