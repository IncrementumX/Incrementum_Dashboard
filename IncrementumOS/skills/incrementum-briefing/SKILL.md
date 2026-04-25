---
name: incrementum-briefing
type: skill-stub
canonical_location: Claude app de Eduardo (não local)
language: pt-BR
---

# incrementum-briefing — stub local

> A skill executável vive no **Claude app** de Eduardo. Este arquivo é o **contrato** local que descreve o output esperado, pra os agentes do IncrementumOS saberem o que pedir e o que esperar de volta.

## Spec (BuildContext v8 §7)

### 1. Summary do dia
- 2–3 linhas. O que importa hoje.

### 2. Sessão (i) — por site
Sites cobertos:
- Valor Econômico
- Estadão
- Brazil Journal
- Pipeline
- NeoFeed
- WSJ
- Barron's

Top notícias por site, com **link clicável** em cada.

### 3. Sessão (ii) — por tema/ativo do portfólio
- Formato: "relevante para X por causa de Y".
- **Máx 1 item por tema.**
- **Não repete** o que (i) já cobre.
- Lê `../../agents_context/state.md` para saber o que é "do portfólio".

### 4. Sugestões adicionais
- Itens curtos com link clicável.

## Restrições

- Todos os links devem ser **clicáveis**.
- Se um site estiver paywalled e não houver acesso, dizer explicitamente — não inventar headline.
- Datas absolutas (ISO).

## Pendências

- Login nos sites paywalled no Mac 24/7 cobre leitura humana. Para automação, V1.5 vai precisar de Valyu / Perplexity / FMP (decisão futura).
