# Como Skills Funcionam

Guia da mecânica interna de skills: formato, invocação, carregamento e custos.

## Anatomia de uma skill

Uma skill é uma pasta com `SKILL.md` (obrigatório) e arquivos de apoio opcionais.

```
minha-skill/
├── SKILL.md        # instruções principais
├── GLOSSARY.md     # vocabulário da skill (opcional)
├── tests.md        # referência externa (opcional)
└── templates/      # arquivos de apoio (opcional)
```

### Frontmatter

`SKILL.md` começa com YAML frontmatter que o agente usa para decidir **quando** invocar:

```yaml
---
name: tdd
description: Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
disable-model-invocation: true   # opcional
---
```

### Os dois tipos de invocação

| | Model-invoked | User-invoked |
|---|---|---|
| Quem dispara | O agente (automaticamente) + você | Só você, digitando `/nome` ou o nome |
| Mecânica | Sem `disable-model-invocation`; `description` rica com gatilhos | `disable-model-invocation: true`; descrição vira resumo humano |
| Custo | **Contexto** — descrição fica na janela toda sessão | **Cognitivo** — você precisa lembrar que ela existe |
| Quando usar | O agente precisa alcançá-la sozinho, ou outra skill precisa | Só dispara na mão |

**Regra de ouro:** use model-invocation só quando o agente precisa pegar a skill sozinho. Se ela só dispara por digitação, deixe user-invoked e pague zero contexto.

### Informação em camadas

Dentro do `SKILL.md`, o conteúdo organiza-se por hierarquia de informação:

1. **Step** (topo) — ação ordenada que o agente executa, terminando em critério de conclusão verificável.
2. **Referência in-skill** — definição/regra consultada sob demanda, no próprio `SKILL.md`.
3. **Referência externa** — conteúdo empurrado para arquivo separado, carregado só quando um *context pointer* (link) dispara.

O princípio é **progressive disclosure**: manter o topo legível, esconder detalhe atrás de links, e carregar só o que o ramo da execução precisa.

## Onde as skills vivem

| Local | Ferramenta | Exemplo |
|---|---|---|
| `~/.config/opencode/skills/` | OpenCode global | `caveman`, `ponytail`, `cavecrew` |
| `.opencode/skills/` | OpenCode por projeto | skills do projeto |
| `~/.claude/skills/` | Claude Code global | pm-skills (via plugin) |
| `.claude/skills/` | Claude Code por projeto | — |
| `~/.agents/skills/` | Padrão Agent Skills (mattpocock, Codex, etc.) | `tdd`, `grill-me` |
| Dentro de plugin | Gerenciado (read-only) | `~/.claude/plugins/cache/pm-skills/` |

## Como plugins se conectam

O OpenCode carrega skills via `plugin` no `opencode.json` / `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-ponytail",
    "superpowers",
    "opencode-rtk",
    "opencode-caveman"
  ]
}
```

Neste ambiente, o `~/.config/opencode/opencode.jsonc` registra 4 plugins (ponytail, superpowers, rtk, caveman). Os plugins do Claude Code (pm-skills, mattpocock, caveman, ponytail) são instalados via `/plugin` e vivem em `~/.claude/plugins/cache/`.

**Duas vias de instalação (Matt Pocock):**
- **Plugin** → bundle read-only e sempre atualizado (não edita).
- **`npx skills@latest add`** → copia os arquivos editáveis pro projeto (pode hackear à vontade).

## Comandos slash vs skills

Além de skills, plugins podem expor **commands** (`/nome`). Ex: o plugin pm-product-strategy tem `/pm-product-strategy:market-scan`, `/pm-product-strategy:pricing`. Commands e skills coexistem; commands são atalhos de fluxo, skills são o conhecimento reutilizável.

## Rotas e composição

Várias skills formam **fluxos** (paths). Exemplo do fluxo principal do Matt Pocock (ver `ask-matt`):

```
grill-with-docs → (prototype? handoff) → to-spec → to-tickets → implement → code-review
```

Regras de composição:
- Skill user-invoked **pode** invocar skill model-invoked.
- Skill user-invoked **não pode** invocar outra user-invoked (só você digita).
- Skills podem referenciar-se nos textos (ex: `prioritize-features` aponta para `prioritization-frameworks`).

## Como escrever uma skill boa

Princípios (ver skill `writing-great-skills` e `writing-skills` do superpowers):

1. **Uma skill = um processo.** Não empilhe fluxos distintos num SKILL.md.
2. **Critério de conclusão verificável.** Cada passo termina com condição checável ("todo modelo modificado contabilizado", não "produza uma lista de mudanças").
3. **Evite no-ops.** Linha que o modelo já obedece por padrão é desperdício de tokens. Teste: "essa linha muda o comportamento vs o padrão?"
4. **Evite negação.** Proibir ("não faça X") nomeia o comportamento proibido e o torna mais disponível. Instrua o positivo.
5. **Pruning constante.** Skills sem disciplina de corte acumulam sedimento (camadas velhas).
6. **Mantenha single source of truth.** Cada significado em um lugar só, edição de comportamento = edição num ponto.

## Custos e trade-offs

- **Cada skill model-invoked** adiciona tokens à janela (a `description` é carregada a cada turno). Mais skills = mais overhead fixo.
- **Router skills** (ex: `ask-matt`) resolvem o excesso de user-invoked skills: uma skill que nomeia as outras e quando usar cada uma.
- **Skills não substituem código.** Elas produzem instruções; o que o modelo faz com elas depende do modelo.

## Nota sobre este ambiente

O sistema já injeta no prompt as skills **carregadas de verdade** (as da lista `available_skills`). As listadas aqui no guia cobrem tudo que está instalado; algumas (ex: ponytail-audit, superpowers via grok) existem no cache do plugin mas podem não estar ativas na sessão atual do OpenCode — verifique invocando a skill ou consultando o prompt.
