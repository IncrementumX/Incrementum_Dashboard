# Issues — flags abertas e pendências

> Lista viva de coisas em aberto. Quando resolvido, marcar `[x]` e adicionar nota de fechamento.

## Build

- [ ] **Construir wiki/philosophy iterativamente** — caminho decidido em 2026-04-26: Eduardo invoca `@incrementum-associate` no Claude.ai chat, conversa adversarial pra extrair filosofia, consolida output, cola no Claude Code, integra em PR. Cadência emergente (2026-04-27): `risk-first.md` é o ponto de partida em curso; demais arquivos emergem da iteração — sem lista pré-fixada. Alinhado com a memória `feedback-philosophy-evolutionary.md`.
  - [x] `risk-first.md` — v1.1 aprovada por Eduardo em 2026-04-29. Mergeado em main via PR #8 em 2026-04-29.
  - [ ] Próximas entradas: emergem da iteração com `@incrementum-associate`. Candidatos naturais: sizing framework, macro overlay, tactical shorts codificado (G3).
- [ ] **Construir wiki/framework iterativamente** — mesmo caminho. Cadência emergente (2026-04-27): sem lista pré-fixada de arquivos; estrutura emerge da iteração. Atacar depois de pelo menos 2 entradas de philosophy.
- [ ] **Materiais base de Eduardo** — Eduardo tem acervo significativo (investment philosophy compilado, framework, diário de notes, notes de teses). Decisão 2026-04-26: caminho **pull-based** (não organizar tudo prevent — começar pelo material mais maduro = investment philosophy montado, outros entram sob demanda). Eduardo vai me indicar paths quando voltar. Materiais privados (diário, decisões de capital) NÃO vão pro repo público — ficam locais ou em Project Knowledge privado do Claude.ai.
- [ ] **5 leis do CEO da Nvidia sobre energia** — Eduardo entrega o spec; vai alimentar seção Energy da wiki/philosophy (parte do energy thesis build). Owner: Eduardo. (2026-04-29)
- [ ] **Filosofia macro de Eduardo → sistema (G5)** — redefinido em 2026-05-01: não é "stack de fontes para agentes" mas capturar a filosofia macro de Eduardo como material base para o sistema. Eduardo tem materiais e vai passar o conteúdo; a gente trabalha em cima quando chegar. Não urgente; sem deadline. (2026-04-29, redefinido 2026-05-01)
- [ ] **Portfolio-level loss limit (G2)** — gap crítico antes de aumentar gross exposure ou rodar alavancado. Sessão com associate 2026-05-01 capturou: modelo mental é **review forçado** (não stop automático); -5% em 1 dia ocorreu por concentração em metais (correlação de book, não erro de tese); alavancagem é ferramenta válida com convicção mas requer estrutura antes de ativar; book altamente correlacionado por exposição em metais. **Threshold de drawdown rolling 30 dias ainda não definido** — sessão dedicada para definir X. Arquivo: `Downloads/associate-conversation-2026-04-30.md`. (2026-04-29, atualizado 2026-05-01)
- [ ] **Short entry codification (G3)** — critério de entrada em shorts atualmente baseado em julgamento. Sessão com associate 2026-05-01 capturou: Eduardo entra em shorts por **julgamento de catalisador** (não regra mecânica); exemplo âncora: zerou Meta +15% pós-resultado ruim — disciplina de catalisador, não de preço; distinção: queda de preço ≠ mudança de tese, diferencia ruído/sinal pela evolução dos fundamentos. Formalização de regras explícitas ainda pendente — sessão dedicada. (2026-04-29, atualizado 2026-05-01)
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
- [ ] **Obsidian vault setup — Karpathy LLM Wiki pattern** (precondição "4+ entradas em philosophy" descartada em 2026-04-28; iniciado):
  - [x] Repo-side plumbing (2026-04-28): `IncrementumOS/raw/` criado com `articles/`, `papers/`, `data/`; `wiki/index.md` (content-oriented) e `wiki/log.md` (append-only) criados; `governance/CLAUDE.md` atualizado com seção **Operations** (Ingest / Query / Lint), citando o gist literal do Karpathy.
  - [ ] Vault `incrementum HQ` (criado fora do OneDrive na Dell em 2026-04-28): apontar Obsidian, criar symlink pra `IncrementumOS/`, instalar **Obsidian Web Clipper** (extensão Chrome), smoke test. Passo a passo for dummies em HTML separado; roadmap detalhado em `~/.claude/plans/o-que-voc-sugeriria-squishy-wilkes.md` Fase 2.
  - [ ] Mac mirror (Fase 3): Obsidian + symlink + Web Clipper.
  - [ ] Avaliar **Obsidian Sync** (pago) — DEFER. Compra só se aparecer dor real (iOS, conflito de config, history).
  - [ ] Avaliar **MCP server** (`obsidian-claude-code-mcp` ou `obsidian-mcp-tools`) — DEFER. Risco de read/write/delete unrestricted no vault sem backup robusto.

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
