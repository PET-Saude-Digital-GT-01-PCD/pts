# Superpowers (14)

Skills do plugin **obra/superpowers** — desenvolvimento de software dirigido por agentes em workspace de **worktrees git**. Tema central: o agente escreve planos, executa em subagentes paralelos, verifica antes de concluir, e o humano revisa cada mudança.

Local: `~/.config/opencode/node_modules/superpowers/skills/`.

## Filosofia central

1. **Plano primeiro** — escrever-plans produz um plano executável passo a passo com critérios de verificação.
2. **Execução em subagentes** — subagent-driven-development roda o plano com subagentes paralelos, cada um num contexto próprio.
3. **Verificação antes de conclusão** — nenhum trabalho é "done" sem verificação.
4. **Humanos revisam tudo** — todas as mudanças propostas passam por review do usuário; `revert` desfaz.
5. **Trabalho em worktrees** — using-git-worktrees mantém a main branch limpa e trabalho isolado.

## Skills

### using-superpowers

- **O que faz**: skill de entrada — descreve o sistema completo, os passos centrais e como as skills se conectam (plano → implementação → verificação → review).
- **Como invocar**: automático — quando o usuário ativa superpowers ou pede desenvolvimento guiado.
- **Quando usar**: começo de qualquer trabalho com superpowers.
- **Quando NÃO usar**: trabalho que não justifica o fluxo completo (overkill para tweak de 1 linha).

### writing-plans

- **O que faz**: escreve plano de implementação estruturado (arquivo `scratchpad/PLANS.md` por padrão): objetivos, mudanças propostas arquivo-a-arquivo, considerações de implementação, steps explícitos com critérios de verificação. Plano é o contrato entre agente e humano.
- **Como invocar**: automático — "escreva o plano", quando uma mudança é grande/multi-arquivo.
- **Quando usar**: qualquer mudança não-trivial antes de codar.
- **Quando NÃO usar**: mudança trivial que cabe num passo.

### subagent-driven-development

- **O que faz**: executa o plano delegando a **subagentes paralelos** — o agente principal vira coordenador, subagentes fazem o trabalho pesado com contexto próprio. O coordenador deve **não duplicar** trabalho dos subagentes.
- **Como invocar**: automático — quando o plano tem múltiplos steps independentes.
- **Quando usar**: mudanças grandes com partes paralelizáveis.
- **Quando NÃO usar**: mudança pequena — subagente overhead puro.

### executing-plans

- **O que faz**: executa o plano passo a passo em sequência, verificando cada step. O gêmeo sequencial do subagent-driven-development.
- **Como invocar**: automático — quando o plano tem steps dependentes.
- **Quando usar**: steps encadeados que não paralelizam.
- **Quando NÃO usar**: steps independentes (subagentes paralelos são melhores).

### verification-before-completion

- **O que faz**: garante que o trabalho está verificado antes de ser dado como pronto — testes, lint, typecheck, build, rodar a app. Declara explicitamente o que foi verificado e o que não foi.
- **Como invocar**: automático — antes de marcar qualquer tarefa como concluída.
- **Quando usar**: sempre antes de finalizar trabalho.
- **Quando NÃO usar**: nunca (é gate obrigatório).

### receiving-code-review

- **O que faz**: como o agente deve receber review do humano — tratar como conversa, responder com mudanças concretas, não argumentar à toa.
- **Como invocar**: automático — quando humano faz comentários de review.
- **Quando usar**: todo feedback do humano no fluxo superpowers.
- **Quando NÃO usar**: —.

### requesting-code-review

- **O que faz**: pede review ao humano de forma estruturada, apresentando mudanças e pontos de atenção.
- **Como invocar**: automático — quando uma mudança está pronta para review.
- **Quando usar**: fim de cada mudança antes do merge.
- **Quando NÃO usar**: —.

### test-driven-development

- **O que faz**: TDD estrito — escrever teste falho primeiro, ver falhar, codar o mínimo, ver passar. Cada feature entra com teste.
- **Como invocar**: automático — quando uma feature/fix precisa de teste.
- **Quando usar**: qualquer lógica nova com teste fazendo sentido.
- **Quando NÃO usar**: protótipo descartável.

### systematic-debugging

- **O que faz**: processo de debugging estruturado — entender o bug (reprodução), formar hipótese, testar hipótese, encontrar causa raiz, fixar, verificar.
- **Como invocar**: automático — "bug", "não funciona", "erro".
- **Quando usar**: debugging não-trivial.
- **Quando NÃO usar**: erro de sintaxe óbvio.

### brainstorming

- **O que faz**: explora ideias em sessão interativa antes de planejar — gera direções, explora trade-offs.
- **Como invocar**: automático — "brainstorm", "quais opções".
- **Quando usar**: antes de comprometer com uma abordagem.
- **Quando NÃO usar**: solução já definida.

### writing-skills

- **O que faz**: guia para escrever skills para agentes — estrutura, frontmatter, exemplos, como a skill deve se comportar. Vem de quem mantém o ecossistema superpowers.
- **Como invocar**: automático — quando escrever uma skill.
- **Quando usar**: criar/editar skills.
- **Quando NÃO usar**: usar skills existentes apenas.

### using-git-worktrees

- **O que faz**: trabalha em worktrees git — branch por mudança, main sempre limpa, merge via review. Instrui a manter o trabalho isolado.
- **Como invocar**: automático — quando trabalhar em mudanças no repo.
- **Quando usar**: qualquer mudança que mereça isolamento.
- **Quando NÃO usar**: repo sem git / preferência por branch único.

### finishing-a-development-branch

- **O que faz**: processo de fechamento de branch — garantir que tudo está testado, integrado, e a branch pode ser mergeada.
- **Como invocar**: automático — quando mudança terminada na worktree.
- **Quando usar**: fim de mudança antes do merge.
- **Quando NÃO usar**: —.

### dispatching-parallel-agents

- **O que faz**: despacha agentes paralelos de forma eficiente — cada um com prompt claro, escopo limitado, contexto próprio.
- **Como invocar**: automático — quando paralelizar trabalho.
- **Quando usar**: tarefas independentes e paralelizáveis.
- **Quando NÃO usar**: tarefas com dependências pesadas entre si.

## Limitações do grupo

- **Workflow pesado para mudanças pequenas** — plano + subagentes + review para um tweak é overkill; use para mudanças de tamanho médio para cima.
- **Depende de worktrees git** — em repos sem git ou com preferência por branch único, adapte.
- **TDD skill é opinada** — conflita com "testes só quando pedidos"; combine com a política do projeto.
- **Duplicação de conceitos com mattpocock** (TDD, plans, review, debugging) — escolha um ecossistema por projeto para não dar instruções conflitantes ao agente.