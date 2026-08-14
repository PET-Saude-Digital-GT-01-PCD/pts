# Cavecrew (3 subagentes)

Subagentes especializados com saída comprimida em estilo caveman. Administram o trabalho delegado: o main thread não gasta contexto executando, só recebe resultado ~60% menor.

Local: `~/.config/opencode/agents/`.

## Família

| Agente | Trabalho | Escopo | Saída |
|---|---|---|---|
| **cavecrew-investigator** | localizar código (read-only) | buscar/mapear | tabela `file:line` comprimida, sem sugerir fixes |
| **cavecrew-builder** | edição cirúrgica | 1-2 arquivos | diff receipt comprimido |
| **cavecrew-reviewer** | revisar diff/branch/arquivo | um diff | 1 linha por finding, `path:line: emoji severidade: problema. fix.` |

Orquestrados pela skill `cavecrew` (05-caveman.md) — decide quando delegar.

---

## cavecrew-investigator

- **O que faz**: localizador de código read-only. Responde "onde X é definido", "quem chama Y", "liste usos de Z", "mapeie este diretório". Recusa sugerir fixes.
- **Quando usar**: você precisa saber onde algo está sem carregar o contexto de buscar.
- **Quando NÃO usar**: tarefa que exige julgamento sobre fix.
- **Exemplo**: sessão perto do limite → "onde está a definição de `UserRepository`?" → tabela `src/repo/user.ts:12` de volta, contexto poupado.
- **⚠️ Recusa de fixes é regra** — se você precisar do fix na mesma delegada, use outro agente ou faça inline.

## cavecrew-builder

- **O que faz**: edição cirúrgica de 1-2 arquivos. Typo fixes, reescritas de função única, renames mecânicos, remoção de comentários, tweaks que preservam formatação. **Recusa dura escopo 3+ arquivos**.
- **Quando usar**: mudança bounded e óbvia dentro de 1-2 arquivos.
- **Quando NÃO usar**: features novas, arquivos novos (a menos que pedido), refactors cross-file — recusará.
- **Exemplo**: typo em docstring → delega ao builder → receipt de diff de volta.
- **⚠️ Use para mecânica, não para design** — decisões de arquitetura ficam no main thread.

## cavecrew-reviewer

- **O que faz**: revisa diff/branch/arquivo. Uma linha por finding, tag de severidade, sem praise, sem scope creep. Pula nits de formatação a menos que mudem significado.
- **Quando usar**: revisar PR/diff sem gastar contexto do main thread.
- **Quando NÃO usar**: review que exige contexto de intenção profunda (aí use code-review do mattpocock, que tem modelo de spec).
- **Exemplo**: "review desta PR" → 5 linhas: 3 medium, 1 high, 1 low, cada uma com fix.

## Limitações do grupo

- **Saída comprimida perde nuance** — findings "uma linha" podem exigir re-leitura do código para entender.
- **builder recusa 3+ arquivos** — mudanças grandes não delegáveis; forçar quebra a regra do agente.
- **investigator não sugere fixes** — quem delega precisa decidir o próximo passo.
- **Benefício depende de contexto cheio** — em sessão curta com contexto sobrando, delegar é overhead puro; a skill `cavecrew` decide isso.