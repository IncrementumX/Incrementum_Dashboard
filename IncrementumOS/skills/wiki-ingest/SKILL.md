---
name: wiki-ingest
type: skill-stub
canonical_location: .claude/commands/wiki-ingest.md
language: en
---

# wiki-ingest — stub local

> Operação **Ingest** do padrão Karpathy LLM Wiki. O executável vive em `.claude/commands/wiki-ingest.md` (Claude Code slash command). Este arquivo é o **contrato** local — descreve o que a skill faz, seus inputs, outputs e restrições, para os agentes do IncrementumOS saberem o que esperar.

## O que faz

1. Lê todos os arquivos em `raw/articles/` com `status: unprocessed` no frontmatter
2. Para cada artigo, determina o destino na wiki (`philosophy/`, `framework/`, ou `teses/`)
3. Cria ou atualiza a página wiki correspondente
4. Atualiza `wiki/index.md` com o link + one-line summary da nova página
5. Appenda entrada em `wiki/log.md` com data ISO e raciocínio
6. Marca o artigo como `status: processed`

## Trigger

`/wiki-ingest` no Claude Code (VS Code extension ou CLI).

## Inputs

| Campo | Fonte |
|---|---|
| Artigos a processar | `raw/articles/*.md` onde frontmatter `status: unprocessed` |
| Destino wiki | Inferido pelo conteúdo do artigo |

## Outputs

| Arquivo | Ação |
|---|---|
| `wiki/<destino>/<slug>.md` | Criado (novo) ou atualizado (página existente) |
| `wiki/index.md` | Nova linha appended na seção correta |
| `wiki/log.md` | Nova entrada appended com `## YYYY-MM-DD` |
| `raw/articles/<arquivo>` | Frontmatter atualizado: `status: processed` |

## Critérios de destino

| Destino | Quando |
|---|---|
| `philosophy/` | Princípios, crenças, modelos mentais de Eduardo sobre investimento |
| `framework/` | Checklists, critérios, processos, regras operacionais |
| `teses/` | Tese de posição ou watchlist sobre ativo/tema específico |

## Restrições

- Nunca edita páginas wiki com >10 linhas já existentes sem mostrar o diff primeiro
- Nomes de arquivo de wiki: `<kebab-case-slug>.md` (sem prefixo de data — data vai no log)
- Datas absolutas ISO (`YYYY-MM-DD`) — nunca relativas
- Não modifica arquivos em `raw/` além de atualizar o frontmatter `status`
- Se `raw/articles/` não tiver arquivos `unprocessed`, reporta explicitamente
