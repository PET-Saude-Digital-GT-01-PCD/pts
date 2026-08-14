# Guia Técnico de Skills para OpenCode / Claude

Guia de referência para todas as skills instaladas neste ambiente — **PM skills**, **Matt Pocock skills**, **Superpowers**, **Caveman**, **Ponytail**, **Cavecrew** e **RTK** — mais a arte de criar artefatos de contexto (`CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, ADRs, glossários).

## O que é uma skill

Uma **skill** é um conjunto de instruções (arquivo `SKILL.md` + arquivos de apoio) que ensina o agente a executar um **processo** determinístico. A skill não substitui o modelo — ela garante que o modelo *repita o mesmo procedimento* toda vez, em vez de improvisar. O objetivo raiz é **previsibilidade**: o agente seguindo o mesmo *processo*, não produzindo a mesma *saída*.

Ver [01-mecanica.md](01-mecanica.md) para detalhes de como skills funcionam, e [00-artefatos.md](00-artefatos.md) para os arquivos de contexto (`CLAUDE.md`/`AGENTS.md`) que direcionam o comportamento do agente.

## Ecossistema instalado (161 skills)

| Ecossistema | Qtd | Onde vivem | Origem | Foco |
|---|---|---|---|---|
| [PM Skills](02-pm-skills/README.md) | 68 | `~/.claude/plugins/cache/pm-skills/` | [The Product Compass](https://www.productcompass.pm) (Paweł Huryn) | Product management: discovery, estratégia, execução, dados |
| [Matt Pocock Skills](03-mattpocock/README.md) | 49 | `~/.agents/skills/` | [mattpocock/skills](https://github.com/mattpocock/skills) | Engenharia de software: TDD, specs, tickets, code review |
| [Superpowers](04-superpowers.md) | 14 | `~/.config/opencode/node_modules/superpowers/` | [obra/superpowers](https://github.com/obra/superpowers) | Metodologia de desenvolvimento ponta-a-ponta |
| [Caveman](05-caveman.md) | 7 | `~/.config/opencode/skills/` | [opencode-caveman](https://github.com/) | Comunicação terse (economia de tokens) |
| [Ponytail](06-ponytail.md) | 6 | `~/.claude/plugins/cache/ponytail/` | [opencode-ponytail](https://github.com/) | Minimalismo de código (anti over-engineering) |
| [Cavecrew](07-cavecrew.md) | 3 (subagentes) | `~/.config/opencode/agents/` | caveman plugin | Delegação a subagentes com saída comprimida |
| RTK | — (plugin CLI) | `~/.local/bin/rtk` | [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | Proxy que comprime output de comandos (economia de tokens) |

## Roteiro de leitura

- **Novato (não conhece nada)** → `00-artefatos.md` → `01-mecanica.md` → `README.md` → escolha um ecossistema
- **PM / produto** → [02-pm-skills/README.md](02-pm-skills/README.md)
- **Engenheiro de software** → [03-mattpocock/README.md](03-mattpocock/README.md) e [04-superpowers.md](04-superpowers.md)
- **Quer economizar tokens / respostas curtas** → [05-caveman.md](05-caveman.md), [08-rtk.md](08-rtk.md)
- **Código inchado / over-engineered** → [06-ponytail.md](06-ponytail.md)
- **Sessão longa, contexto estourando** → [07-cavecrew.md](07-cavecrew.md)
- **Começando um projeto do zero** → `01-mecanica.md` → `00-artefatos.md` → Superpowers → Matt Pocock

## Mapa de decisão: "quero X → uso skill Y"

### Descoberta de produto (descobrir o que construir)

| Situação | Skill |
|---|---|
| Explorar ideia de produto novo, validar demanda | `brainstorm-ideas-new`, `brainstorm-experiments-new`, `identify-assumptions-new`, `lean-canvas`, `startup-canvas` |
| Melhorar produto existente, ideias de features | `brainstorm-ideas-existing`, `brainstorm-experiments-existing`, `identify-assumptions-existing`, `opportunity-solution-tree` |
| Triar pedidos de clientes / backlog | `analyze-feature-requests`, `prioritize-features`, `prioritize-assumptions`, `prioritization-frameworks` |
| Preparar entrevistas com usuários | `interview-script`, `summarize-interview` |
| Definir personas / segmentos / ICP | `user-personas`, `user-segmentation`, `market-segments`, `ideal-customer-profile` |

### Estratégia de produto

| Situação | Skill |
|---|---|
| Visão do produto | `product-vision` |
| Estratégia completa (9 seções) | `product-strategy` |
| Modelo de negócio | `business-model`, `lean-canvas`, `startup-canvas` |
| Macro-ambiente | `pestle-analysis`, `swot-analysis`, `porters-five-forces`, `ansoff-matrix` |
| Precificação / monetização | `pricing-strategy`, `monetization-strategy` |
| Proposta de valor | `value-proposition`, `value-prop-statements`, `positioning-ideas` |

### Execução de produto

| Situação | Skill |
|---|---|
| Escrever PRD | `create-prd` |
| Backlog em formato WWA | `wwas` |
| User stories / job stories | `user-stories`, `job-stories` |
| Roadmap orientado a resultado | `outcome-roadmap` |
| Planejar sprint | `sprint-plan`, `brainstorm-okrs` |
| Retrospectiva | `retro` |
| Pre-mortem / red team de plano | `pre-mortem`, `strategy-red-team` |
| Resumo de reunião | `summarize-meeting` |
| Release notes | `release-notes` |

### Pesquisa de mercado e dados

| Situação | Skill |
|---|---|
| Análise de concorrentes | `competitor-analysis`, `competitive-battlecard` |
| Jornada do cliente | `customer-journey-map` |
| Tamanho de mercado | `market-sizing` |
| Análise de feedback | `sentiment-analysis` |
| SQL a partir de linguagem natural | `sql-queries` |
| A/B test | `ab-test-analysis` |
| Análise de coortes / retenção | `cohort-analysis` |
| Métricas / North Star | `north-star-metric`, `metrics-dashboard` |

### Engenharia (Matt Pocock)

| Situação | Skill |
|---|---|
| Não sei por onde começar | `ask-matt` |
| Alinhar antes de codar (grilling) | `grill-me`, `grill-with-docs` |
| Especificação a partir da conversa | `to-spec` |
| Quebrar spec em tickets | `to-tickets` |
| Implementar ticket | `implement` |
| TDD | `tdd` |
| Revisar código | `code-review`, `caveman-review` |
| Debug de bug difícil | `diagnosing-bugs` |
| Refatorar arquitetura | `improve-codebase-architecture`, `codebase-design` |
| Pesquisar tópico com fontes primárias | `research` |
| Resolver merge conflict | `resolving-merge-conflicts` |

### Engenharia (Superpowers)

| Situação | Skill |
|---|---|
| Trabalho de desenvolvimento do zero | `brainstorming` → `using-git-worktrees` → `writing-plans` → `subagent-driven-development` → `requesting-code-review` → `finishing-a-development-branch` |
| Bug / comportamento inesperado | `systematic-debugging`, `verification-before-completion` |
| Receber review de código | `receiving-code-review` |
| Criar nova skill | `writing-skills` |

### Comunicação e estilo

| Situação | Skill |
|---|---|
| Respostas curtas, economia de tokens | `caveman` |
| Commit message curto | `caveman-commit` |
| Review curto de PR | `caveman-review` |
| Comprimir arquivos de memória | `caveman-compress` |
| Código minimalista (anti over-engineering) | `ponytail` |
| Auditoria de bloat no repo | `ponytail-audit` |
| Lista de dívidas de código (comentários `ponytail:`) | `ponytail-debt` |

### Outros

| Situação | Skill |
|---|---|
| Delegar tarefa a subagente | `cavecrew` (builder/investigator/reviewer) |
| Handoff para outra sessão | `handoff`, `claude-handoff` |
| Ensinar conceito ao usuário | `teach` |
| Escrever/editar artigos | `writing-fragments`, `writing-shape`, `writing-beats`, `edit-article`, `grammar-check` |
| Documentos legais | `draft-nda`, `privacy-policy` |
| Avaliar currículo | `review-resume` |
| Setup de hooks git / pre-commit | `setup-pre-commit`, `git-guardrails-claude-code` |
| Documentar app AI-built antes de ship | `shipping-artifacts`, `intended-vs-implemented` |

## Limitações gerais das skills

- **Skills não são código.** São instruções de texto; a qualidade da execução depende do modelo por baixo.
- **Overlap entre ecossistemas.** Superpowers e Matt Pocock cobrem o mesmo terreno (TDD, code review, plans). Escolha **um fluxo** e seja consistente; misturar os dois gera conflito de instruções.
- **Contexto é recurso.** Skills model-invoked carregam descrição sempre na janela de contexto. Muitas skills = mais tokens de "manutenção".
- **Algumas skills estão "em progresso" ou "deprecadas".** Matt Pocock marca `in-progress/` e `deprecated/` — use com cautela, podem mudar ou sumir.

## Convenções de nome

- **Model-invoked** (invocadas automaticamente pelo agente): têm `description` rica com gatilhos. Ex: `tdd`, `grilling`, `code-review`.
- **User-invoked** (só por digitação, `/comando` ou nome): têm `disable-model-invocation: true`. Ex: `grill-me`, `to-spec`, `implement`.
- **Router skills** (indicam qual skill usar): `ask-matt` (mattpocock), `caveman-help`, `ponytail-help`, `find-skills`.

---

*Guia gerado a partir da leitura dos `SKILL.md` reais instalados no ambiente (versões: pm-skills 2.1.0, mattpocock 1.2.0, superpowers 6.3.0, caveman, ponytail 4.8.4).*
