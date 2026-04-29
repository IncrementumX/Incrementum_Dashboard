---
name: wiki-ingest
type: skill-stub
canonical_location: .claude/commands/wiki-ingest.md
language: pt-BR
---

# wiki-ingest — stub local

> Operação **Ingest** do padrão Karpathy LLM Wiki. O executável vive em `.claude/commands/wiki-ingest.md` (Claude Code slash command). Este arquivo é o **contrato** local — descreve o que a skill faz, seus inputs, outputs e restrições, para os agentes do IncrementumOS saberem o que esperar.

## O que faz

1. Lê todos os arquivos em `raw/articles/` e `raw/readings/` com `status: unprocessed` no frontmatter
2. Para cada artigo, determina o destino na wiki (`framework/`, `macro/`, `assets/`, ou `portfolio/decisions/`)
3. Cria ou atualiza a página wiki correspondente
4. Atualiza `wiki/index.md` com o link + one-line summary da nova página
5. Appenda entrada em `wiki/log.md` com data ISO e raciocínio
6. Marca o artigo como `status: processed`

## Trigger

`/wiki-ingest` no Claude Code (VS Code extension ou CLI).

## Inputs

| Campo | Fonte |
|---|---|
| Artigos a processar | `raw/articles/*.md` e `raw/readings/**/*.md` onde frontmatter `status: unprocessed` |
| Destino wiki | Inferido pelo conteúdo do artigo |

## Outputs

| Arquivo | Ação |
|---|---|
| `wiki/<destino>/<slug>.md` | Criado (novo) ou atualizado (página existente) |
| `wiki/index.md` | Nova linha appended na seção correta |
| `wiki/log.md` | Nova entrada appended com `## YYYY-MM-DD` |
| `raw/<path>/<arquivo>` | Frontmatter atualizado: `status: processed` |

## Critérios de destino

| Destino | Quando |
|---|---|
| `framework/` | Princípios, crenças, modelos mentais de Eduardo, checklists, critérios, processos, regras operacionais |
| `macro/` | Análise macro time-sensitive com driver macroeconômico claro |
| `assets/` | Cobertura e tese sobre ativo ou setor específico (flat — um arquivo por ativo) |
| `portfolio/decisions/` | Decisão tática de portfólio (executar ou não seguir); naming: `YYYY-MM-DD-ativo-acao.md` |

## Restrições

- Nunca edita páginas wiki com >10 linhas já existentes sem mostrar o diff primeiro
- Nomes de arquivo de wiki: `<kebab-case-slug>.md` (sem prefixo de data — data vai no log), exceto `portfolio/decisions/` que usa `YYYY-MM-DD-ativo-acao.md`
- Caminhos de wiki: sempre `IncrementumOS/wiki/<subfolder>/<slug>.md` — nunca `wiki/wiki/...`
- Datas absolutas ISO (`YYYY-MM-DD`) — nunca relativas
- Não modifica arquivos em `raw/` além de atualizar o frontmatter `status` (única exceção permitida)
- Só appenda em `wiki/index.md` para páginas **novas** — páginas existentes já têm entrada no índice
- Nunca adiciona header `## YYYY-MM-DD` duplicado em `log.md` — coalesce entradas na mesma data
- Se não houver arquivos `unprocessed` em `raw/`, reporta explicitamente
