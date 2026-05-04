---
name: incrementum-briefing
type: skill-stub
canonical_location: Claude app de Eduardo (não local)
language: pt-BR
---

# incrementum-briefing — stub local

> A skill executável vive no **Claude app** de Eduardo. Este arquivo é o **contrato** local que descreve o output esperado, para os agentes do IncrementumOS saberem o que pedir e o que esperar de volta.

## Spec (BuildContext v8 §7 — rev. 2026-05-03)

### 1. Sumário do dia

2–3 linhas. Foco em **impacto no portfólio** — não dump de notícias. O que mudou que Eduardo precisa saber antes de abrir o mercado?

### 2. Sessão (i) — por site, separado

Cada fonte tem seu próprio bloco. Não agrupar fontes. Para cada site:

- **Valor Econômico** — top 2 headlines com link clicável
- **Estadão** — top 2 headlines com link clicável
- **Brazil Journal** — top 2 headlines com link clicável
- **Pipeline** — top 2 headlines com link clicável
- **NeoFeed** — top 2 headlines com link clicável
- **WSJ** — top 2 headlines com link clicável
- **Barron's** — top 2 headlines com link clicável

Se paywalled e sem acesso: dizer explicitamente — não inventar headline, não usar conteúdo de 48h atrás como se fosse hoje.

### 3. Sessão (ii) — por tema/ativo do portfólio

- Lê `../../agents_context/state.md` para saber o que é "do portfólio".
- Formato: "**[Ativo/Tema]:** [fato relevante]. *Relevante para [tese] porque [razão].*"
- **Máx 1 item por tema.**
- Não repete o que (i) já cobre.
- Quando o item toca diretamente uma posição aberta: adicionar flag **[AÇÃO SUGERIDA: revisar/add/trim/monitor]** com uma linha de racional.

### 4. Sugestões adicionais

Leituras relevantes com link clicável. Curto — máx 3 itens.

## Restrições

- Links clicáveis em tudo.
- Se paywalled sem acesso: declarar explicitamente. Nunca inventar.
- Datas absolutas ISO (YYYY-MM-DD).
- Sumário orientado a impacto no portfólio — não jornalístico.

## Output

Salvar o briefing em: `Briefings/YYYY-MM-DD.md` no vault Obsidian via Obsidian connector.
Formato do filename: data ISO do dia do briefing.

## Scraping de sites paywalled

Usar Playwright CLI via Bash com o perfil do Chrome do Mac (sessões já logadas):
```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launchPersistentContext(
    process.env.HOME + '/Library/Application Support/Google/Chrome',
    { headless: true, channel: 'chrome' }
  );
  const page = await browser.newPage();
  await page.goto('https://valor.globo.com');
  const content = await page.content();
  console.log(content);
  await browser.close();
})();
"
```

Fazer o mesmo para cada site paywalled. Extrair headlines e links do HTML retornado.

## Setup operacional

- Mac Chrome: logado em Valor, Estadão, Brazil Journal, Pipeline, NeoFeed
- Cron no Mac: 10h BRT (13h UTC) todo dia útil
- Playwright CLI: disponível no Mac via `npx playwright`
- Para automação futura de paywalled via API: Perplexity connector (decisão V1.5 pendente)
