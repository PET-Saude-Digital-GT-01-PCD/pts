# 16 — Ciclos de Engenharia

> **Input:** `skills to setup/` (ecossistema), decisão do time (Superpowers) · **Nível:** fluxo de trabalho, skills, TDD, rituais

## 1. Fluxo oficial: Superpowers

Escolha única e consistente (não misturar com Matt Pocock — armadilha conhecida).

```
brainstorming → writing-plans → subagent-driven-development
    → verification-before-completion → requesting-code-review
    → finishing-a-development-branch
```

### Ciclo por incremento

1. **brainstorming** — alinhar abordagem antes de codar.
2. **writing-plans** — plano escrito antes da implementação; escopo verificável.
3. **subagent-driven-development** — implementação delegada a subagentes com instruções precisas.
4. **verification-before-completion** — nenhum ticket fecha sem prova (teste/typecheck/execução).
5. **requesting-code-review** — revisão antes de integrar.
6. **finishing-a-development-branch** — merge limpo, branch finalizada.

### Complementos

| Situação | Skill |
|---|---|
| Bug difícil / regressão | `systematic-debugging` |
| Delegar tarefa com saída comprimida | `cavecrew` (investigator/builder/reviewer) |
| Documentar app antes do piloto | `shipping-artifacts` (architecture, flows, permissions, variables, tests) |
| Manter linguagem ubíqua | `domain-modeling` (CONTEXT.md) |

> **Atenção:** skills do Superpowers vivem em `~/.config/opencode/node_modules/superpowers` e podem não estar ativas na sessão — verificar registro no `opencode.jsonc` antes do primeiro uso.

## 2. TDD no núcleo

Regras determinísticas têm **TDD obrigatório** (AGENTS.md):

- `calcularSemaforo` · `elegibilidadePorEscopo` · `calcularDivergencia` · `semforoDeReuniao` · `verificarConflitoMetas`.
- Fluxo: red → green → refactor (Vitest). Funções puras, sem I/O.
- Cobertura de casos de borda documentada no próprio teste.

## 3. Setup do repositório (antes do código)

| Passo | Artefato | Skill |
|---|---|---|
| Memória do projeto | `AGENTS.md` + `CONTEXT.md` | — |
| Decisões de arquitetura | `docs/adr/0001-0010` | `domain-modeling` |
| Scaffolding (quando código existir) | issue tracker + labels + layout docs | `/setup-matt-pocock-skills` |

## 4. Rituais

| Ritual | Cadência | Propósito |
|---|---|---|
| Revisão de indicadores | Quinzenal | KRs do piloto (plano/09) |
| Entrega de valor | Semanal | feature/melhoria usável |
| Retrospectiva | Por fase | aprender e ajustar (plano/10) |
| Red-teaming | Antes de cada go/no-go | atacar assumptions (plano/08) |
| Code review | Por incremento | Superpowers: requesting-code-review |

## 5. Ordem de construção técnica

**Fase 1 (MVP piloto):**

1. Setup repo: CI + Docker + scaffold + schema Prisma + mock e-SUS.
2. `iam`: auth + RBAC configurável (plano/17, blocos A–B) + admissão + acesso por caso.
3. `reception`: cadastro + cuidador + consentimento + baseline (degradada).
4. `triage`: triagem + semáforo (TDD) + elegibilidade.
5. `clinical`: SOAP + avaliação fisio (checklist → CIF).
6. `care-plan`: metas SMART + painel cruzado + mural + eventos.
7. Telas núcleo 1–9 (plano/14).

**Fase 2:** governança (dashboards), contrarreferência real, portal cidadão, comparativo de versões, RLS, encerramento completo.

**Fase 3:** multi-CER, offline PWA, e-SUS real (se A5 validado), pacote de replicação.

Núcleo (`care-plan`) independe de e-SUS — risco A5 não bloqueia a Fase 1.

## 6. Referências

- Ecossistema completo de skills: `skills to setup/README.md`.
- Requisitos não funcionais: `Perguntas/04`.
