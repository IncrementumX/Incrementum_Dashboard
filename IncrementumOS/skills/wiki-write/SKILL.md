---
name: wiki-write
type: skill-stub
canonical_location: .claude/commands/wiki-write.md
language: pt-BR
---

# wiki-write — stub local

> Operação de escrita direta na wiki do IncrementumOS. O executável vive em `.claude/commands/wiki-write.md` (Claude Code slash command). Este arquivo é o **contrato** local — descreve o que a skill faz, seus inputs, outputs e restrições.

## O que faz

1. Recebe um path de destino na wiki e o conteúdo a escrever
2. Se o arquivo existir com mais de 10 linhas, mostra o diff e aguarda confirmação
3. Escreve ou sobrescreve o arquivo no path indicado
4. Appenda entrada em `wiki/log.md` com data ISO, path e descrição da mudança
5. Se for página nova, indica que o usuário deve atualizar `wiki/index.md` manualmente (ou via wiki-ingest)

## Diferença vs wiki-ingest

| | wiki-ingest | wiki-write |
|---|---|---|
| Trigger | Artigo em `raw/` | Decisão direta do agente/Eduardo |
| Escopo | Batch (todos os `unprocessed`) | Single file |
| Source | Artigo raw como input | Conteúdo gerado na conversa |
| Index | Atualiza automaticamente | Avisa, não atualiza |

## Trigger

`/wiki-write` no Claude Code (VS Code extension ou CLI).

## Inputs

| Campo | Fonte |
|---|---|
| Path de destino | Argumento (`$ARGUMENTS`) ou perguntado ao usuário |
| Conteúdo | Gerado na conversa atual ou passado como argumento |

## Outputs

| Arquivo | Ação |
|---|---|
| `wiki/<path>/<slug>.md` | Criado (novo) ou sobrescrito (existente, após confirmação) |
| `wiki/log.md` | Nova entrada appended com `## YYYY-MM-DD` |

## Restrições

- Nunca sobrescreve arquivo com >10 linhas sem mostrar diff e receber confirmação explícita
- Datas absolutas ISO (`YYYY-MM-DD`) — nunca relativas
- Caminhos sempre `IncrementumOS/wiki/<subfolder>/<slug>.md`
- Nunca modifica `wiki/index.md` — responsabilidade do usuário ou do wiki-ingest
- Nunca inventa dados financeiros — só escreve o que foi discutido/decidido na conversa
- Nunca adiciona header `## YYYY-MM-DD` duplicado em `log.md`
