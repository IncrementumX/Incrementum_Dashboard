# Analysis Queue

> Status de cada análise em curso. Atualizar ao começar, durante e ao fechar.
> Status válidos: `pending` · `in-progress` · `awaiting-review` · `done` · `blocked`

## Formato

```
## <YYYY-MM-DD> — <título da análise>
- **Solicitado por:** Eduardo
- **Tipo:** análise completa / briefing / trade idea / pontual
- **Skills envolvidas:** memo / assessment / snapshot / briefing
- **Status:** pending
- **Owner:** analista
- **Notas:** <gaps, dúvidas, dependências>
- **Output:** <link para arquivo final, quando done>
```

---

## Em curso

## 2026-05-04 — META Platforms memo v9
- **Solicitado por:** Eduardo
- **Tipo:** análise completa — upgrade do memo v8
- **Skills envolvidas:** docx
- **Status:** done
- **Owner:** analista
- **Output alvo:** `META_Memo_Incrementum_v9.docx`
- **Output:** `C:\Users\eduar\OneDrive\AI\Projects\Incrementum Dashboard\META_Memo_Incrementum_v9.docx` — 1,100 paragraphs, 59 headings, 11 sections, validated 2026-05-04
- **Notas:** CAPEX Cycle como pilar central (Section 3), Options Analysis expandida com 5 estruturas (Section 7), WACC documentado (Rf 4.4%, beta 1.15, ERP 5.5%, WACC 11%), OpEx ex-D&A explícito (Section 4.2), P/E como metodologia principal, DCF como complemento. Todas ressalvas do associate sobre v8 resolvidas.

---

## 2026-05-04 — META Platforms memo v8

- **Solicitado por:** Eduardo
- **Tipo:** análise completa — upgrade do memo v7
- **Skills envolvidas:** comps-analysis, earnings-analysis, docx
- **Status:** done
- **Owner:** analista
- **Output alvo:** `META_Memo_Incrementum_v8.docx`
- **Review:** `IncrementumOS/reviews/2026-05-04_META-memo-v8.md` — PASSOU COM RESSALVAS (2 materiais)

### Contexto do associate (refinement)

O memo v7 (produzido 2026-05-03) funciona como research note sell-side — bem organizado, números corretos, mas não estruturado como decisão de portfólio de Eduardo. Fraquezas identificadas pelo associate em QA adversarial:

1. **Executive Summary genérico:** três pilares que qualquer analista diria sobre META hoje. Falta a convicção específica de Eduardo e a justificativa de timing (por que entrar a US$609 agora e não aguardar 2Q26 para confirmar execução?).

2. **CAPEX/D&A Analysis enterrada no Company Overview:** é o debate central da tese. Merece seção própria — "CAPEX Cycle Analysis" — com modelagem de D&A step-up (de US$18.6bn em 2025 para potencial US$35-50bn em 2028) e FCF normalizado.

3. **Valuation sem modelo próprio:** usa P/E de consenso com âncora de "5yr avg TTM P/E ~22-23x" que inclui o pânico de 2022 (queda de 70%) como base. Âncora defensável? Precisa de modelo de EPS com sensibilidade de D&A — mesmo que simples — para testar as premissas em vez de aceitar consenso.

4. **Bear case suave:** +18% revenue CAGR no pior cenário ainda é crescimento forte. O que mata isso de verdade não está modelado: recessão publicitária global, TikTok ban revertido, mudança estrutural de privacidade, monetização de AI < 2030. Bear case precisa de tese de invalidação real.

5. **Comp Table errada:** NVDA e AMZN são ruído para valuation de advertising. Comps reais: GOOGL e RDDT (advertising-first). AAPL, MSFT como referências de large-cap tech múltiplo. Usar `comps-analysis` skill — não tabela manual.

6. **Merits descritivos:** "Fastest Revenue Growth Since 2021" é dado, não merit. Merit seria: Advantage+ capturando share of wallet de anunciantes em escala real, o que historicamente precede re-rating de múltiplos. Interpretação, não lista.

7. **Mitigants fracos:** Risk 1 mitigado por "BofA incorporates D&A" é terceirizar análise. Falta modelo próprio que teste: se D&A chega a US$45bn em 2028, qual o EPS real e qual múltiplo o mercado aplica?

8. **Follow-Ups no corpo:** pertencem ao work queue, não ao documento.

### Leitura obrigatória antes de produzir

- `../../wiki/macro/worldview.md` § Three Core Themes e § AI as Disinflationary Force — META se posiciona no framework de Eduardo como expressão do buildout de AI infrastructure (Layer 5 — Applications) e como bet publicitária em regime de dólar fraco. A conexão com o macro overlay de Eduardo é o que diferencia este memo de uma research note genérica.
- `../../wiki/macro/ai-infrastructure-buildout.md` § The Five-Layer Stack — META é Layer 5 (Applications). O debate CAPEX de META é diretamente análogo ao debate hyperscaler capex que é um dos "Signals to Watch" nesta página. Usar isso na seção CAPEX Cycle Analysis.
- `../../agents_context/decisions.md` § Investment philosophy — Druckenmiller-style, high-conviction concentration. A seção de Investment Structure precisa estar conectada com a filosofia de sizing de Eduardo, não apenas com o budget de US$5k.

### Estrutura proposta para v8 (11 seções)

1. **Executive Summary** — convicção de Eduardo + justificativa de timing + scenario table
2. **Company Overview** — business model, geografia (enxuto — não duplicar CAPEX aqui)
3. **CAPEX Cycle Analysis** *(nova seção)* — o que está sendo construído, D&A schedule, FCF em transição, bull/bear de monetização de AI
4. **Summary Financials** — histórico 5yr + 1Q26 (via earnings-analysis); modelo de EPS com sensibilidade de D&A
5. **Comp Table** *(via comps-analysis skill)* — GOOGL + RDDT core peers; AAPL/MSFT/NVDA como referências
6. **Valuation** — modelo próprio (bear/base/bull com âncora defensável) + DCF simples
7. **Investment Structure** — manter estrutura de v7 (é a seção mais sólida); conectar sizing à filosofia de Eduardo
8. **Merits** — 3 merits com interpretação (não descrição)
9. **Risks & Mitigants** — bear case real; mitigants com modelo próprio
10. **Key Questions** — integradas como hipóteses de resposta que alteram o cenário
11. **Appendix** — data sources; 1Q26 key data; Follow-Ups move para work queue

### Dados do v7 disponíveis para reuso

O analista tem acesso ao conteúdo completo do v7 via `meta_body_dump.txt` na raiz do repo. Reuse os dados sourced de company filings ([IR]) — não re-invente números que já estão corretos. O que precisa ser reconstruído: valuation model, comp table, bear case, CAPEX section.

## Histórico (done)

<!-- vazio por ora -->
