# Issues — flags abertas e pendências

> Lista viva de coisas em aberto. Quando resolvido, marcar `[x]` e adicionar nota de fechamento.

## Build

- [ ] **Construir wiki/philosophy iterativamente** — caminho decidido em 2026-04-26: Eduardo invoca `@incrementum-associate` no Claude.ai chat, conversa adversarial pra extrair filosofia, consolida output, cola no Claude Code, integra em PR. Cadência emergente (2026-04-27): `risk-first.md` é o ponto de partida em curso; demais arquivos emergem da iteração — sem lista pré-fixada. Alinhado com a memória `feedback-philosophy-evolutionary.md`.
- [ ] **Construir wiki/framework iterativamente** — mesmo caminho. Cadência emergente (2026-04-27): sem lista pré-fixada de arquivos; estrutura emerge da iteração. Atacar depois de pelo menos 2 entradas de philosophy.
- [ ] **Materiais base de Eduardo** — Eduardo tem acervo significativo (investment philosophy compilado, framework, diário de notes, notes de teses). Decisão 2026-04-26: caminho **pull-based** (não organizar tudo prevent — começar pelo material mais maduro = investment philosophy montado, outros entram sob demanda). Eduardo vai me indicar paths quando voltar. Materiais privados (diário, decisões de capital) NÃO vão pro repo público — ficam locais ou em Project Knowledge privado do Claude.ai.
- [ ] **Revisitar acervo OneDrive\Incrementum\Incrementum Book** — Eduardo abre os arquivos sozinho, narra o que tem em cada, dá uma limpa, e me manda comments. A partir dos comments refina-se **Materiais base de Eduardo** (acima). P1, owner Eduardo. (2026-04-27)
- [ ] **Material de leitura já consumido → Obsidian (.md)** — materiais que Eduardo já leu (research, PDFs, screenshots) viram `.md` no Obsidian para economizar espaço. **Bloqueado por Obsidian vault setup** (Build env). P2. (2026-04-27)
- [ ] **CLAUDE.md operacional iterar** — começamos minimal em `governance/CLAUDE.md`; iteramos com Eduardo conforme padrões aparecem.
- [ ] **Modelo Excel (`incrementum-model`)** — Eduardo define estrutura (template parado em março). Adiado em 2026-04-26.
- [ ] **Agentes acessarem o Dashboard com dados populados** — hoje `state.md` é dummy e os agentes não têm acesso real ao portfólio. Objetivo: analista e associate leem estado vivo (posições, sizing, P&L, hedges) sem Eduardo precisar colar manualmente. Caminhos a avaliar:
  - **A.** Exporter Dashboard → `state.md` (snapshot regenerado em build/cron, commitado no repo).
  - **B.** Connector direto: agente consulta Supabase via endpoint read-only (requer RLS bem configurado e schema estável).
  - **C.** Edge function pública read-only (Supabase functions já configuradas no repo) servindo snapshot JSON que agente consome.
  - Bloqueios: (1) escolher caminho; (2) auditar RLS atual no Supabase; (3) definir schema canônico do que vai pro `state.md` (posições, sizing, hedges, datas, fontes). Atacar depois do Bloco 1 do build inicial.

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

- [ ] `claude-mem` v12.4.7 instalado em 2026-04-26 via `npm install -g claude-mem` (verificado: `claude-mem --version`). Validar funcionamento depois de algumas sessões.
- [ ] `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — setar quando for ativar agent teams.
- [ ] Obsidian vault: apontar para `IncrementumOS/` quando Eduardo quiser começar a editar pelo Obsidian. Decisão 2026-04-26: começar depois de pelo menos 4 entradas de wiki/philosophy.

## Pendência: referências ao state.md vs Dashboard

- [x] Resolvido em 2026-04-25: `governance/CLAUDE.md` e `skills/incrementum-analista/SKILL.md` agora deixam claro que `state.md` é o **espelho** que os agentes leem, e que o Dashboard (`src/`) é a fonte canônica. Estrutura state.md ↔ Dashboard (como popular state.md a partir do Dashboard) fica em aberto até a integração ser definida.

## Pendência: surface dos agentes nos clientes Claude

Os perfis dos agentes vivem como SKILL.md em `IncrementumOS/skills/` (doc canônica).
Surface em cada ambiente:

- [x] **Claude Code** (VS Code add-in): `.claude/agents/incrementum-analista.md` e
  `.claude/agents/incrementum-associate.md` criados. Mergeados via PR #2 em 2026-04-25.
- [x] **Claude.ai (web/mobile)**: skills `incrementum-analista` e `incrementum-associate`
  uploaded em Customize em 2026-04-26 (versões em `~/Downloads/incrementum-{analista,associate}.md`,
  ajustadas com `description:` no frontmatter e paths absolutos `IncrementumOS/...`).
  Project Knowledge sincronizado via GitHub connector apontando para `IncrementumX/Incrementum_Dashboard@main`,
  pastas `IncrementumOS/` e `CLAUDE.md` raiz. Instruções do projeto coladas com regras
  "no bullshit operacionalizado" + blacklist Robinhood/StockTitan/Investing.com + fonte
  primária pra companhias. 3 testes de smoke passados.
