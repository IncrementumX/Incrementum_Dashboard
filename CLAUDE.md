# CLAUDE.md — Incrementum repo

> Diretrizes gerais para Claude Code trabalhando neste repo. Aplicam-se a todo trabalho aqui — Dashboard, IncrementumOS, e qualquer escopo futuro.
> **Não confundir com `IncrementumOS/governance/CLAUDE.md`**, que é o arquivo de mandamentos operacionais lido pelos agentes (associate, analista) do IncrementumOS.

## Idioma

- Comunicação com Eduardo (chat, respostas, iterações): português.
- Termos técnicos em inglês são aceitos quando convenção (commit, PR, branch, sizing, hedge, equity).
- Commits, PRs e comentários no código: inglês.
- Materiais, teses, memos, Atlas, documentação técnica: inglês.

## Princípios de trabalho (Karpathy-inspired)

### 1. Think before coding — não assuma

LLMs tendem a escolher uma interpretação silenciosamente. Aqui, não:

- Estado as suposições explicitamente. Se incerto, **pergunte** em vez de adivinhar.
- Quando há ambiguidade, apresente as interpretações alternativas — não escolha em silêncio.
- Quando há uma abordagem mais simples, **diga**. Push back é parte do trabalho.
- Quando confuso, nomeie o que não está claro e pergunte.

### 2. Simplicity first — código mínimo

Combata a tendência a overengineering:

- Sem features além do que foi pedido.
- Sem abstrações para código de uso único.
- Sem "flexibilidade" ou "configurabilidade" que ninguém pediu.
- Sem error handling para cenários impossíveis.
- Se 200 linhas podem virar 50, reescreva.

Teste: um engenheiro sênior diria que isso está overcomplicado? Se sim, simplifique.

### 3. Surgical changes — toque só no que precisa

Ao editar código existente:

- **Não** "melhore" código adjacente, comentários ou formatação.
- **Não** refatore o que não está quebrado.
- Match o estilo existente, mesmo se faria diferente.
- Se notar dead code não-relacionado, **mencione** — não delete.

Quando sua mudança cria órfãos:
- Remova imports/variáveis/funções que **suas** mudanças tornaram unused.
- **Não** remova dead code pré-existente sem ser pedido.

Teste: cada linha alterada deve rastrear diretamente para o pedido do usuário.

### 4. Goal-driven execution — critério verificável

Transforme imperativos em metas verificáveis:

- "Adicione validação" → "Escreva testes para inputs inválidos, depois faça passar."
- "Conserta o bug" → "Escreva um teste que reproduza, depois faça passar."
- "Refatore X" → "Garanta que os testes passam antes e depois."

Para tarefas multi-step, declare o plano:

```
1. [passo] → verifica: [check]
2. [passo] → verifica: [check]
```

## Específico do Incrementum

### Repo

- `app.js`, `index.html`, `styles.css`, `src/`, `supabase/`, `tools/` — Incrementum Dashboard (frontend portfólio).
- `IncrementumOS/` — operating system pessoal de Eduardo (governança, agentes, skills, wiki). Lê o próprio `IncrementumOS/governance/CLAUDE.md` para regras dos agentes.

### Branch / PR

- Nunca commit direto na `main`.
- Trabalhar em branch (`feat/...`, `fix/...`, `chore/...`).
- PR → Eduardo revisa → merge.
- Commits curtos e atômicos.

### Datas

- Datas absolutas (ISO `YYYY-MM-DD`). Nunca "hoje", "ontem", "semana passada" em arquivos versionados.

### O que NÃO fazer

- Não criar arquivos `.md` de documentação que ninguém pediu.
- Não popular `IncrementumOS/agents_context/state.md` com dados reais de portfólio sem permissão (é dummy por design no build inicial).
- Não inventar URLs.
- Não inventar números financeiros — só com fonte.
- Não citar dados financeiros de Robinhood, StockTitan ou Investing.com.
- Dados de mercado: tag `[Bloomberg, DD-MMM-YYYY]` ou `[IR]` para filings SEC/RI.
- Web screeners: marcar como `[WEB-SCREEN]` para verificação posterior.

## Tradeoff

Estas diretrizes vieram com viés para **cautela sobre velocidade**. Para tarefas triviais (typo, one-liner óbvio), use bom senso — não toda mudança precisa do rigor completo. O objetivo é reduzir erros caros em trabalho não-trivial, não desacelerar o trivial.

---

*Inspirado em [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) — adaptado para o contexto do Incrementum.*
