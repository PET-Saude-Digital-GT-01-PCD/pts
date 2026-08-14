# Caveman (7)

Plugin de comunicação ultra-compacta para sessões de agente. Corte de ~75% de tokens mantendo precisão técnica. Filosofia: código/commits escritos normal, conversa comprimida.

Local: `~/.config/opencode/skills/`.

## Skills

### caveman

- **O que faz**: o modo de comunicação. Níveis: lite (prosa apertada), full (caveman clássico, padrão), ultra (abreviações + flechas causais), wenyan-lite/full/ultra (chinês clássico). Regras: drop artigos/filler/hedging, fragmentos OK, erros citados exatos, Auto-Clarity suspende modo para avisos de segurança/ações irreversíveis/confusão do usuário. Desliga: "stop caveman" ou "normal mode".
- **Como invocar**: automático — "caveman mode", "fale como caveman", "menos tokens", "seja breve", "/caveman".
- **Quando usar**: sessões longas, orçamento de contexto apertado, comunicação com quem entende o estilo.
- **Quando NÃO usar**: quem prefere prosa completa; docs/commits/PRs (regra explícita: código normal); segurança/ações irreversíveis (Auto-Clarity).
- **Exemplo**: "Bug no middleware de auth. Token expiry usa `<` não `<=`. Fix:"

### cavecrew

- **O que faz**: guia de delegação para subagentes estilo caveman. Decide QUANDO disparar `cavecrew-investigator` (localizar código), `cavecrew-builder` (edição 1-2 arquivos), `cavecrew-reviewer` (revisar diff) em vez de trabalhar inline. Saída dos subagentes é comprimida → o tool-result volta ~60% menor → contexto principal dura mais em sessões longas.
- **Como invocar**: automático — "delegate para subagente", "use cavecrew", "spawn investigator/builder/reviewer", "salve contexto", "saída comprimida".
- **Quando usar**: sessão longa, contexto precioso, trabalho delegável que caberia num subagente especializado.
- **Quando NÃO usar**: mudança que você pode fazer inline sem custo; tarefa que exige ver o resultado completo sem compressão.
- **Exemplo**: sessão perto do limite → delega "onde está X?" ao investigator, resultado comprimido volta sem estourar contexto.
- **Relacionadas**: cavecrew-builder/investigator/reviewer (agents), 07-cavecrew.md.

### caveman-commit

- **O que faz**: gera mensagens de commit ultra-comprimidas em formato Conventional Commits. Subject ≤50 chars, body só quando o "porquê" não é óbvio.
- **Como invocar**: automático — "escreva um commit", "commit message", "/commit", ao estagiar mudanças.
- **Quando usar**: gerar commit conciso.
- **Quando NÃO usar**: repo que exige mensagens completas/detalhadas.
- **Exemplo**: `fix(auth): correct token expiry check`.

### caveman-compress

- **O que faz**: comprime arquivos de memória em linguagem natural (CLAUDE.md, todos, preferências) para caveman, economizando tokens. Preserva substância, código, URLs, estrutura. Overwrite com backup `FILE.original.md`.
- **Como invocar**: `/caveman-compress FILEPATH` ou "compress memory file".
- **Quando usar**: arquivos de memória grandes.
- **Quando NÃO usar**: arquivo pequeno; arquivo que você quer manter legível em prosa.
- **⚠️ Unidirecional**: agente comprime; edições futuras em prosa geram drift.

### caveman-help

- **O que faz**: cartão de referência rápida de todos os modos/skills/comandos caveman. Exibição única, não modo persistente.
- **Como invocar**: `/caveman-help`, "caveman help", "quais comandos caveman".
- **Quando usar**: aprender/consultar as opções disponíveis.
- **Quando NÃO usar**: —.

### caveman-review

- **O que faz**: comentários de code review ultra-comprimidos — uma linha por finding: localização, problema, fix.
- **Como invocar**: automático — "revise esta PR", "code review", "/review", ao revisar PR.
- **Quando usar**: revisar diffs/PRs de forma compacta.
- **Quando NÃO usar**: review que exige contexto narrativo completo.
- **Exemplo**: `src/auth.ts:42: ⚠️ medium: token check usa `<`, deve ser `<=`. Fix: troque operador.`

### caveman-stats

- **O que faz**: mostra uso real de tokens e economia estimada da sessão. Lê direto do log de sessão do Claude Code — sem estimativa de IA. Números injetados pelo hook mode-tracker; o modelo não calcula.
- **Como invocar**: `/caveman-stats`.
- **Quando usar**: medir economia da sessão.
- **Quando NÃO usar**: —.

## Limitações do grupo

- **Dependência do plugin/hook** — caveman-stats exige o hook mode-tracker do plugin; sem ele não injeta números.
- **Economia de tokens depende da disciplina do agente** — o plugin define regras, mas o modelo pode driftar para prosa se não reforçado.
- **Estilo ≠ qualidade** — caveman comprime comunicação, não substitui raciocínio; um bug mal entendido continua mal entendido em caveman.
- **Não usar para código/commits/docs** — regra explícita das próprias skills.
- **caveman-compress é destrutivo** — requer backup/git.