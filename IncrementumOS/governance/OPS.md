# OPS — Workflows e Regra de Verdade

## Workflows (BuildContext v8 §9)

### Análise completa (função i)
```
"analisa X" → associate → analista → associate → Eduardo
```
- Associate refina escopo, levanta gaps, define entregável.
- Analista executa: orquestra `memo`, `assessment`, `snapshot` conforme o pedido.
- Associate faz QA adversarial: fontes, premissas, exageros.
- Eduardo decide.

### Briefing diário (função ii)
```
"briefing de hoje" → analista → Eduardo
```
- Analista chama skill `briefing` (spec em `../skills/incrementum-briefing/SKILL.md`).
- Sem QA do associate por padrão (briefing é high-frequency).

### Trade idea (função iii)
```
"e se eu shortear X?" → associate → analista → associate → Eduardo
```
- Associate refina (qual o thesis, qual o catalisador, qual o risco assimétrico, qual o sizing máximo aceitável).
- Analista monta: tese, sizing, estrutura (equity vs. opção), hedge, stop.

### Simples / pontual
```
"o que está acontecendo com ouro?" → analista → Eduardo
```
- Pula o associate. Resposta direta com fontes.

## Regra de Verdade (BuildContext v8 §10)

A fonte canônica do estado do sistema:

| Arquivo | Função |
|---|---|
| `../work_queues/analysis.md` | Status de cada task em andamento |
| `../reviews/` | Output do associate após revisão |
| `../agents_context/state.md` | Portfólio atual (dummy por ora) |
| `../agents_context/decisions.md` | Decisões fixadas por Eduardo (append-only) |
| `../agents_context/issues.md` | Flags abertas, pendências |

Quando há conflito entre o que está nos arquivos e o que está na memória de sessão (claude-mem), **os arquivos vencem**. Memória de sessão é contexto auxiliar, não fonte de verdade.

## Branch e PR

- Trabalho em branch (`feat/...`, `fix/...`, `chore/...`).
- Nunca commit direto na `main`.
- PR → Eduardo revisa → aprova → merge.

## Quando atualizar o quê

- **state.md** — quando portfólio mudar (Eduardo informa). Hoje: dummy.
- **decisions.md** — quando Eduardo fixa uma decisão ("decidi não shortar X porque..."). Append com data ISO.
- **issues.md** — quando aparece flag, dúvida não resolvida, pendência. Marcar resolvido quando fechar.
- **work_queues/analysis.md** — quando começar/terminar análise. Status: pending / in-progress / awaiting-review / done.
- **reviews/** — quando associate revisa output do analista. Um arquivo por review, nome `YYYY-MM-DD_<topic>.md`.
