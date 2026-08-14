# Matt Pocock Skills — Visão Geral

Skills de engenharia do [mattpocock/skills](https://github.com/mattpocock/skills) (instaladas em `~/.agents/skills/`, plugin v1.2.0). Filosofia: **engenharia real, não vibe coding** — skills pequenas, adaptáveis, composáveis, que funcionam com qualquer modelo.

## Os 4 problemas que as skills resolvem

1. **O agente não fez o que eu queria** (misalignment) → grilling: `/grill-me` e `/grill-with-docs` fazem o agente perguntar antes de construir.
2. **O agente é verboso demais** → linguagem compartilhada: `CONTEXT.md` + ADRs dão ao agente um vocabulário de domínio conciso.
3. **O código não funciona** → feedback loops: `/tdd` (red-green-refactor), `/diagnosing-bugs`.
4. **Construímos um ball of mud** → design de código: `/to-spec`, `/codebase-design`, `/improve-codebase-architecture`.

## Grupos

| Grupo | Skills | Arquivo |
|---|---|---|
| Engineering | 17 | [engineering.md](engineering.md) |
| Productivity | 5 | [productivity.md](productivity.md) |
| Personal | 2 | [personal.md](personal.md) |
| Misc | 4 | [misc.md](misc.md) |
| In-progress | 9 | [in-progress.md](in-progress.md) |
| Deprecated | 4 | [README — ver nota abaixo](#deprecated) |

## O fluxo principal: ideia → ship

O skill `ask-matt` é o router. O caminho mais comum:

```
grill-with-docs (alinhar) 
    → [se precisa responder com runnable: handoff ↔ prototype]
    → to-spec (multi-sessão?) 
    → to-tickets 
    → implement (usa tdd) 
    → code-review
```

Regras de higiene:
- Manter grilling → spec → tickets num **único contexto não comprimido** (o "smart zone", ~120k tokens).
- Cada `/implement` começa contexto fresco a partir do ticket.
- `/setup-matt-pocock-skills` deve rodar **uma vez por repo** antes das outras skills de engineering.

## Como as skills dependem de artefatos

- `CONTEXT.md` (glossário de domínio) — lido por `tdd`, `diagnosing-bugs`, `code-review`, `to-spec` para vocab consistente.
- `docs/adr/` — registra decisões; `domain-modeling` escreve, `improve-codebase-architecture` respeita.
- `docs/agents/issue-tracker.md` — config do issue tracker criada por `setup-matt-pocock-skills`; assumida por `to-spec`, `to-tickets`, `triage`, `code-review`, `wayfinder`.

## Deprecated

`design-an-interface`, `qa`, `request-refactor-plan`, `ubiquitous-language` — movidas para `deprecated/` no plugin v1.2.0. Substituídas por: `design-an-interface` → `codebase-design`/`prototype`; `qa` → `triage`; `request-refactor-plan` → `to-tickets` + `improve-codebase-architecture`; `ubiquitous-language` → `domain-modeling` (que escreve `CONTEXT.md`). Use as substituições; as antigas podem sumir.