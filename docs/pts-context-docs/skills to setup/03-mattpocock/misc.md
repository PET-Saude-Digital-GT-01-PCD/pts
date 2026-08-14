# Matt Pocock — Misc (4)

Skills variadas de engenharia que não se encaixam nos outros grupos: proto-typing de interface, qualidade de código, exercícios, hooks de segurança e revisão de currículo.

## Invocação

- **User-invoked**: `scaffold-exercises`, `migrate-to-shoehorn`
- **Model-invoked**: `design-an-interface`, `git-guardrails-claude-code`, `review-resume`

---

## design-an-interface

- **O que faz**: gera **múltiplas interfaces radicalmente diferentes** para um módulo usando subagentes paralelos — explode o espaço de design antes de convergir. Foco em variedade radical, não incremental.
- **Como invocar**: automático — "design a API", "explore interfaces", "desenha 3 shapes".
- **Quando usar**: quer ver opções de API/interface antes de decidir.
- **Quando NÃO usar**: a interface já é óbvia (overkill).
- **Exemplo**: 3 designs de interface para módulo de auth: (1) callback-based, (2) promise-based, (3) subscription-based, comparados lado a lado.
- **⚠️ Nota**: classificação de lifecycle do plugin é ambígua — pode ser deprecated (substituída por `codebase-design`). Trate como utilitária.

## git-guardrails-claude-code

- **O que faz**: configura hooks do Claude Code para **bloquear comandos git destrutivos** (push, reset --hard, clean, branch -D, rebase) antes de executar. Cria `~/.claude/settings.json` com PreToolUse hooks.
- **Como invocar**: automático — "bloqueie git push", "git safety hooks", "guarda-corpos git".
- **Quando usar**: quer proteção contra comandos destrutivos em sessão de agente.
- **Quando NÃO usar**: usa OpenCode como único cliente (hook é do Claude Code, não do OpenCode).
- **Exemplo**: `/push` em sessão → hook bloqueia e pergunta antes de prosseguir.

## migrate-to-shoehorn

- **O que faz**: migra arquivos de teste de `as` type assertions para `@total-typescript/shoehorn`, que não mascara erros reais de tipo (o `as` pode cobrir bugs de runtime). Use com TS 5.5+.
- **Como invocar**: automático — "migre para shoehorn", "troque `as` nos testes".
- **Quando usar**: testes TS com `as` type assertions que deveriam ser parciais de dados de teste.
- **Quando NÃO usar**: código de produção (skill é de testes); testes sem `as` para migrar.
- **Exemplo**: `const user = {...} as User` → `const user: User = {...}` ou `userPartial` quando só parte é usada.

## scaffold-exercises

- **O que faz**: cria estrutura de diretório de exercícios (seções, problemas, soluções, explainers) que passa no linting, incluindo stubs e README por exercício.
- **Como invocar**: automático — "scaffold exercícios", "crie stubs de exercício".
- **Quando usar**: montar novo curso/seção de exercícios.
- **Quando NÃO usar**: curso completo com conteúdo (skill só monta estrutura).
- **Exemplo**: curso de TypeScript → `exercises/01-intro/{problem,solution,explainer}` por seção, lint-clean.

## review-resume

- **O que faz**: revisão de currículo de PM contra 10 best practices (resumo, fórmula XYZ+S, keywords, estrutura...) com exemplos diretos do texto.
- **Como invocar**: automático — "revise meu currículo".
- **Quando usar**: currículo de PM antes de candidatura.
- **Quando NÃO usar**: outros cargos (é específica de PM).
- **Exemplo**: currículo + job description → feedback em 10 práticas, sugestões editáveis citando texto.

## Limitações do grupo

- **Heterogêneo** — grupo agrupa por exclusão, não por tema comum.
- **git-guardrails é específico do Claude Code** — não protege sessões do OpenCode.
- **migrate-to-shoehorn** exige pacote `@total-typescript/shoehorn` instalado e TS 5.5+.
- **design-an-interface** pode estar deprecated — consulte a versão mais recente do plugin antes de confiar.