# Matt Pocock — Personal (2)

Skills de uso pessoal de desenvolvimento: compressão de estilo de fala e pesquisa de código da própria máquina.

## Invocação

- **User-invoked**: `caveman-compress`
- **Model-invoked**: `caveman`

---

## caveman

- **O que faz**: modo de comunicação ultra-comprimido — economiza ~75% de tokens falando como caveman, mantendo precisão técnica. Níveis: lite, full (padrão), ultra, wenyan-lite, wenyan-full, wenyan-ultra. Regras explícitas: drop artigos/filler/hedging, fragmentos OK, erros citados exatos, Auto-Clarity (suspende caveman para avisos de segurança/ações irreversíveis/confusão), desliga com "stop caveman".
- **Como invocar**: automático — quando usuário pede "modo caveman", "/caveman", "menos tokens", "seja breve".
- **Quando usar**: sessões longas que precisam de contexto; comunicação enxuta.
- **Quando NÃO usar**: conversa normal sem pedido explícito (auto-trigger também em "be brief").
- **Exemplo**: "falta vírgula no SQL" → "bug no query. Faltou vírgula na linha 12. Fix:"
- **Relacionadas**: usado com `handoff` (handoffs em caveman economizam contexto); alternativas do próprio ecossistema: `ponytail` (código), `cavecrew`.

## caveman-compress

- **O que faz**: comprime arquivos de memória em linguagem natural (CLAUDE.md, todos, preferências) para formato caveman, economizando tokens de input. Preserva substância técnica, código, URLs, estrutura. Overwrite o arquivo original; backup legível em `FILE.original.md`. Se o arquivo já for compressível (32% +), recompila.
- **Como invocar**: `/caveman-compress FILEPATH` ou "compress memory file".
- **Quando usar**: arquivos de memória grandes; quer reduzir custo de contexto permanente.
- **Quando NÃO usar**: arquivo pequeno (ganho marginal); arquivos que você lê em prosa com frequência (compressão é via operador, não usuário).
- **Exemplo**: `/caveman-compress ~/.config/opencode/AGENTS.md` → versão caveman + backup `.original.md`.
- **⚠️ Nota**: compressão é **unidirecional** — agente comprime, humano ainda consegue ler; mas edições futuras em prosa geram drift entre formas.

## Limitações do grupo

- **caveman é estilo, não funcionalidade** — não muda o trabalho, muda a embalagem; pessoas que não falam caveman (ou não querem) devem evitar.
- **caveman-compress é destrutivo** (overwrite com backup) — só usar com arquivo em git ou backup manual garantido.
- **wenyan levels** exigem familiaridade com chinês clássico para serem lidos.