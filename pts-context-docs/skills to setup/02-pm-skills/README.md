# PM Skills — Visão Geral

68 skills de Product Management do plugin **PM Skills** (por Paweł Huryn, The Product Compass), em 9 grupos. Cada grupo é um plugin separado instalado via `/plugin` no Claude Code (em `~/.claude/plugins/cache/pm-skills/`).

## Os 9 grupos

| Grupo | Skills | Foco |
|---|---|---|
| [Product Discovery](product-discovery.md) | 13 | Descoberta contínua: ideias, experimentos, entrevistas, priorização |
| [Product Strategy](product-strategy.md) | 12 | Visão, estratégia, canvas, análise macro, pricing, valor |
| [Go-to-Market](go-to-market.md) | 6 | Lançamento: segmento inicial, ICP, GTM, motions, battlecards |
| [Execution](execution.md) | 16 | PRD, backlog, OKRs, sprint, retro, pre-mortem, release notes |
| [Market Research](market-research.md) | 7 | Concorrentes, jornada, segmentos, mercado, personas, feedback |
| [Marketing & Growth](marketing-growth.md) | 5 | Marketing, North Star, posicionamento, nome, statements |
| [Data Analytics](data-analytics.md) | 3 | A/B test, coortes, SQL |
| [AI Shipping](ai-shipping.md) | 2 | Docs de revisão para app AI-built, auditoria intenção vs implementação |
| [Toolkit](toolkit.md) | 4 | NDA, privacy policy, gramática, currículo |

## Roteiro de leitura

- Quer começar produto novo → `product-discovery` (ideias/experimentos/assumptions) → `product-strategy` → `go-to-market`
- Produto existente, quer melhorar → `product-discovery` (OST, brainstorm-ideas-existing) → `execution`
- Vai lançar → `go-to-market`
- Precisa de dados → `data-analytics`
- Vai shipar app feito com IA → `ai-shipping`

## Filosofia transversal

Vários princípios repetem-se entre skills:

- **Priorize oportunidades (problemas), não features.** "Never allow customers to design solutions." — guia `analyze-feature-requests`, `opportunity-solution-tree`, `prioritization-frameworks`.
- **Opportunity Score** (Dan Olsen): `Importance × (1 − Satisfaction)`, normalizado 0–1 — o score padrão para priorizar problemas de cliente.
- **Product Trio** (Teresa Torres): PM + Designer + Engenheiro descobrem juntos; "melhores ideias vêm dos engenheiros".
- **Skin-in-the-game** (Alberto Savoia): valide disposição a pagar com comprometimento real, não opinião.
- **Medir comportamento, não opinião** — recorre em entrevista, experimentos, análise.
- **JTBD**: mercado definido por problemas/JTBD, não demografia.

## Dependências entre skills

- `analyze-feature-requests` / `prioritize-features` / `prioritize-assumptions` → usam fórmulas de `prioritization-frameworks`
- `opportunity-solution-tree` → usa Opportunity Score; alimenta brainstorm/experimentos
- `brainstorm-ideas-*` → geram ideias que `prioritize-features` ranqueia
- `identify-assumptions-*` → alimenta `prioritize-assumptions` → `brainstorm-experiments-*`
- `market-segments` / `user-personas` / `ideal-customer-profile` → alimentam `value-proposition`, `beachhead-segment`, `gtm-strategy`
- `pre-mortem` (execution) e `strategy-red-team` (execution) são complementares, não substitutos

## Nota de invocação

As skills usam `$ARGUMENTS` no corpo — o que o usuário descreve. Todas são model-invoked (o agente as alcança pelo gatilho da descrição). Alguns grupos têm **commands** slash (`/pm-product-strategy:market-scan`, `/pm-product-strategy:pricing`, etc.) que orquestram múltiplas skills.