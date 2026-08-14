# Artefatos de Contexto: CLAUDE.md, AGENTS.md, CONTEXT.md, ADRs, GLOSSARY

Os arquivos de contexto são a memória permanente do projeto que o agente carrega (ou consulta) a cada sessão. Eles são o que transforma um agente genérico num agente que conhece **seu** projeto.

## Hierarquia de memória

| Arquivo | Escopo | Carregado | Papel |
|---|---|---|---|
| `~/.config/opencode/AGENTS.md` | Global (todas as sessões) | Automático | Instruções pessoais/globais do usuário |
| `CLAUDE.md` | Raiz do projeto | Automático no Claude Code | Instruções + contexto do projeto |
| `AGENTS.md` | Raiz do projeto | Automático no OpenCode | O mesmo que `CLAUDE.md`, mas para OpenCode. No OpenCode, `CLAUDE.md` **não** é lido por padrão — use `AGENTS.md` |
| `.opencode/` | Raiz do projeto | Automático | Config e regras específicas do OpenCode |
| `CONTEXT.md` | Raiz do projeto | Consulta por skills (mattpocock) | Linguagem ubíqua do domínio (glossário) |
| `docs/adr/*.md` | Raiz ou módulo | Consulta por skills (mattpocock) | Architecture Decision Records |
| `GLOSSARY.md` | Pasta da skill | Consulta pela skill | Termos internos de uma skill |

> **⚠️ Diferença crítica entre ferramentas:** Claude Code lê `CLAUDE.md`; OpenCode lê `AGENTS.md`. Alguns projetos criam os dois (ou um symlink `AGENTS.md -> CLAUDE.md`, como fazem os plugins do mattpocock e superpowers). Se você usa ambos, sincronize os dois arquivos.

## AGENTS.md / CLAUDE.md — o quê e por quê

**O que é:** um arquivo Markdown, na raiz do projeto (ou global), que instrui o agente sobre como trabalhar **naquele projeto**. Não é documentação de produto — é instrução operacional.

**Por que existe:** cada projeto tem convenções, comandos, arquitetura e armadilhas. Sem instruções, o agente improvisa: usa a biblioteca errada, roda o teste errado, ignora o padrão de commit. O `AGENTS.md` elimina esse chute.

### O que colocar

1. **Comandos**: build, test, lint, typecheck, dev. (Ex: `pnpm dev`, `pnpm test --watch`)
2. **Convenções de código**: estilo, nomes, padrões de arquitetura que o projeto segue.
3. **Estrutura do projeto**: mapa de diretórios, onde mora o quê.
4. **Regras de trabalho**: o que o agente deve/não deve fazer (ex: "não commitar sem rodar testes").
5. **Vocabulário do domínio**: termos que o projeto usa e seu significado.
6. **Armadilhas conhecidas**: erros comuns, gotchas, decisões que não devem ser refeitas.

### Exemplo mínimo

```markdown
# AGENTS.md — Meu Projeto

## Comandos
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`

## Estrutura
- `src/` — código-fonte
- `src/lib/` — módulos compartilhados
- `tests/` — testes de integração

## Regras
- Todo commit deve passar em `npm test`
- Não use `any` em TypeScript
- Prefira composição a herança

## Vocabulário
- **PTS**: Projeto Terapêutico Singular
- **CER**: Centro Especializado em Reabilitação
```

### Exemplo real (deste ambiente)

```markdown
<!-- caveman-begin -->
Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Pattern: [thing] [action] [reason]. [next step].
- Switch level: /caveman lite|full|ultra|wenyan
- Stop: "stop caveman" or "normal mode"
<!-- caveman-end -->
```

Este é o `~/.config/opencode/AGENTS.md` global — um exemplo de instrução global de estilo que afeta todas as sessões.

## CONTEXT.md — linguagem ubíqua

**O que é:** o glossário vivo do domínio do projeto. Lista os termos técnicos/domínio, seus significados canônicos e como devem ser usados em código, testes e documentação.

**Por que existe:** quando o agente e o especialista de domínio falam línguas diferentes, o agente usa 20 palavras onde 1 basta. Exemplo real do mattpocock:

- **ANTES**: "There's a problem when a lesson inside a section of a course is made 'real' (i.e. given a spot in the file system)"
- **DEPOIS**: "There's a problem with the **materialization cascade**"

**Como funciona:** as skills do mattpocock (`tdd`, `diagnosing-bugs`, `code-review`, `to-spec`) leem `CONTEXT.md` para nomear variáveis, funções e testes com o vocabulário do domínio. Criar/atualizar é trabalho da skill `domain-modeling` (e `grill-with-docs` durante o grilling).

**Estrutura típica:**

```markdown
# Contexto — PTS Digital

## Termos
- **PTS** (Projeto Terapêutico Singular): instrumento de gestão do cuidado individual
- **PCD** (Pessoa com Deficiência): usuário do CER
- **CER** (Centro Especializado em Reabilitação): unidade de saúde onde o PTS opera
- **Materialização**: tornar um elemento abstrato concreto no sistema

## Múltiplos contextos
Se o repo tiver vários bounded contexts, use `CONTEXT-MAP.md` na raiz apontando para cada `CONTEXT.md`.
```

## ADR — Architecture Decision Records

**O que é:** registro curto de uma decisão de arquitetura significativa. Formato clássico (Michael Nygard):

```markdown
# ADR-0001: PostgreSQL para o write model

## Status
Aceito

## Contexto
O write model precisa de transações ACID e consistência forte...

## Decisão
Usar PostgreSQL com o padrão CQRS; eventos persistidos na tabela `events`...

## Consequências
- Positivas: consistência forte, transações nativas
- Negativas: escala horizontal mais difícil, exige migrações
```

**Por que existe:** decisões caras de arquitetura não devem ser re-litigadas em cada sessão. A skill `domain-modeling` registra ADRs quando decisões se cristalizam. A skill `improve-codebase-architecture` respeita ADRs existentes (não reabre decisões registradas).

## GLOSSARY.md (de skills)

Cada skill do Matt Pocock pode ter seu próprio `GLOSSARY.md` — o vocabulário interno daquela skill. Ex: `writing-great-skills/GLOSSARY.md` define **premature completion**, **duplication**, **sediment**, **sprawl**, **no-op**, **negation**. Não confundir com o `CONTEXT.md` do projeto (glossário do domínio) — o da skill é do processo da skill.

## Como os artefatos se relacionam com skills

- `AGENTS.md`/`CLAUDE.md` → instruem o agente **sempre** (cada sessão)
- `CONTEXT.md` → fornece vocabulário às skills **quando executam** (tdd, code-review...)
- `docs/adr/` → registra decisões; skills consultam e respeitam
- `shipping-artifacts` skill → gera um conjunto mínimo de docs (`architecture.md`, `flows.md`, `permissions.md`, `variables.md`, `tests.md`) que tornam um app AI-built revisável antes de ship

## Fluxo de trabalho recomendado

1. Crie `AGENTS.md` na raiz do projeto (ou rode `/setup-matt-pocock-skills` para scaffolding automático de issue tracker + labels + layout de docs).
2. Durante qualquer grilling (`/grill-with-docs`), deixe a skill criar/atualizar `CONTEXT.md` e ADRs.
3. Antes de ship de app AI-built, rode `shipping-artifacts` para gerar a doc set de revisão.
4. Revisite `AGENTS.md` sempre que o projeto mudar de regras ou estrutura.

## Erros comuns

- **Copiar `CLAUDE.md` para `AGENTS.md` uma única vez** e nunca mais sincronizar → drift entre ferramentas.
- **Transformar `AGENTS.md` em doc de produto** → não é lugar para feature specs; é instrução operacional.
- **Ignorar `CONTEXT.md`** → o agente inventa termos, o vocabulário degrada sessão a sessão.
- **`AGENTS.md` gigante** → custo de contexto por sessão. Mantenha enxuto; jogue detalhe em arquivos consultados sob demanda.
