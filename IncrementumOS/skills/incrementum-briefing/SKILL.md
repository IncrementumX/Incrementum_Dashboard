---
name: incrementum-briefing
description: "Gera o briefing diário do Incrementum. Use quando Eduardo pede 'rode o briefing de hoje', 'briefing', 'o que aconteceu hoje', ou quando invocado via cron. Scrapa 7 sites financeiros (Valor, Estadão, Brazil Journal, Pipeline, NeoFeed, WSJ, Barron's), filtra por relevância ao portfólio, e salva em Briefings/YYYY-MM-DD.md no Obsidian."
metadata:
  version: 2.0.0
  author: IncrementumX
  category: briefing
---

# incrementum-briefing

## Workflow completo

### Step 1 — Data e contexto do portfólio

```bash
date +%Y-%m-%d
```

Ler `IncrementumOS/agents_context/state.md` para saber quais ativos/temas estão no portfólio.

### Step 2 — Scraping dos sites

```bash
cd IncrementumOS/skills/incrementum-briefing
node scripts/scrape.js all
```

O script retorna JSON com headlines + URLs de todos os 7 sites. Se um site falhar, continua — não trava.

### Step 3 — Web search para macro e mercado

Para cada tema do portfólio em `state.md`, fazer web search por novidades do dia:
- `gold price today site:reuters.com OR site:bloomberg.com`
- `uranium market today`
- `BESI semiconductor news today`
- `MU Micron news today`
- Fed/macro: `FOMC rates today`

### Step 4 — Montar o briefing

Formato obrigatório:

```markdown
# Incrementum — Briefing DD-MM-YYYY

## Sumário do dia

[5-10 linhas. O que aconteceu no mundo hoje — macro, geopolítica, mercados, Brasil. Não filtrar por portfólio aqui — cobrir o que importa para qualquer investidor informado.]

## Sumário do portfólio

[5-10 linhas. O que do dia acima impacta diretamente o portfólio de Eduardo? Conectar os eventos do sumário do dia com as posições abertas e teses ativas. Ser específico — não genérico.]

---

## (i) Fontes

### Valor Econômico
- [Título do headline](URL)
- [Título do headline](URL)

### Estadão
- [Título do headline](URL)
- [Título do headline](URL)

### Brazil Journal
- [Título do headline](URL)
- [Título do headline](URL)

### Pipeline
- [Título do headline](URL)
- [Título do headline](URL)

### NeoFeed
- [Título do headline](URL)
- [Título do headline](URL)

### WSJ
- [Título do headline](URL)
- [Título do headline](URL)

### Barron's
- [Título do headline](URL)
- [Título do headline](URL)

> Se site inacessível: declarar explicitamente. Nunca inventar headlines.

---

## (ii) Temas do portfólio

**[Ativo/Tema]:** [fato relevante]. *Relevante para [tese] porque [razão].* [AÇÃO SUGERIDA: monitor/add/trim/revisar — opcional, só quando claro]

[Máx 1 item por tema. Não repetir o que (i) já cobre.]

---

## Sugestões adicionais

- [Leitura relevante](URL) — [por quê importa]

---

*Gerado em DD-MM-YYYY HH:MM via incrementum-briefing v2.0*
```

### Step 5 — Salvar no Obsidian

Salvar o briefing em:
- Caminho: `Briefings/YYYY-MM-DD.md` no vault Obsidian
- Via Obsidian MCP connector (se disponível): usar `obsidian_patch_content` ou `obsidian_append_content`
- Fallback: escrever diretamente no path do vault em disco

### Step 6 — Confirmar para Eduardo

Responder: "Briefing de YYYY-MM-DD salvo em Briefings/YYYY-MM-DD.md."

## Restrições

- Links clicáveis em tudo
- Se site inacessível: declarar explicitamente, nunca inventar
- Datas absolutas ISO
- Sumário orientado a impacto no portfólio — não newsdesk genérico
- Máx 1 item por tema na seção (ii)

