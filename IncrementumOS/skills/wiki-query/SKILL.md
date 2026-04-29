---
name: wiki-query
type: skill-stub
canonical_location: .claude/commands/wiki-query.md
language: en
---

# wiki-query — stub local

> Operação **Query** do padrão Karpathy LLM Wiki. O executável vive em `.claude/commands/wiki-query.md` (Claude Code slash command). Este arquivo é o **contrato** local.

## O que faz

1. Lê `wiki/index.md` para mapear as páginas disponíveis
2. Identifica até 3 páginas mais relevantes para a pergunta
3. Lê essas páginas
4. Sintetiza uma resposta com citações no formato `[[page-name]]`
5. Aponta gaps: perguntas não respondidas pela wiki atual

## Trigger

`/wiki-query <pergunta>` no Claude Code.

Exemplo: `/wiki-query como Eduardo pensa em sizing?`

## Inputs

| Campo | Fonte |
|---|---|
| Pergunta | Argumento passado ao comando (`$ARGUMENTS`) |
| Índice de páginas | `wiki/index.md` |
| Conteúdo das páginas | `wiki/**/*.md` (máx. 3 páginas por query) |

## Outputs

Resposta em texto com:
- Síntese da resposta baseada nas páginas relevantes
- Citações `[[page-name]]` para cada claim
- Seção "Gaps" — o que a wiki atual não responde

## Restrições

- Máximo 3 páginas abertas por query (evita context flood)
- Se `wiki/index.md` estiver vazio, reporta explicitamente — não assume contexto
- Se `$ARGUMENTS` estiver vazio, pede pergunta ao usuário
- Não modifica nenhum arquivo (read-only)
