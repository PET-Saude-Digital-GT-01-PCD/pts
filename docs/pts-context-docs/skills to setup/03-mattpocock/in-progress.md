# Matt Pocock — In-progress (9)

Skills novas e experimentais. Fora do fluxo "grill → spec → tickets → implement" principal. Estabilidade não garantida; comportamento pode mudar entre versões do plugin.

## Invocação

Misturado — verifique cada skill.

---

## claude-handoff

- **O que faz**: passa a conversa atual para um agente de background fresco que continua o trabalho imediatamente. Variação do `handoff` para fluxo contínuo com múltiplos agentes.
- **Como invocar**: automático — quer continuar trabalho em background.
- **Quando usar**: contexto cheio + trabalho delegável agora.
- **Quando NÃO usar**: quer documento de handoff persistente (use `handoff`).
- **Exemplo**: contexto próximo do limite → `claude-handoff` → agente novo retoma do ponto atual.

## find-skills

- **O que faz**: ajuda usuários a descobrir e instalar skills de agentes ("como faço X", "existe skill para X?"). Explica onde skills vivem, como escrever a sua, onde buscar na comunidade.
- **Como invocar**: automático — "ache uma skill", "como instalo skill".
- **Quando usar**: quer extender capacidades do agente com skills.
- **Quando NÃO usar**: você só vai usar skills já instaladas.
- **Exemplo**: "quero skill para analisar CSV" → roteiro de busca e instalação.

## loop-me

- **O que faz**: grilla o usuário sobre specs de workflows que ele quer construir **dentro deste workspace**.
- **Como invocar**: `/loop-me`.
- **Quando usar**: definir specs de workflows/automação para este repo, com alinhamento por grilling.
- **Quando NÃO usar**: workflow fora do workspace.
- **Exemplo**: "quero um workflow de CI para o PTS" → grilling sobre o spec.

## migrate-to-shoehorn

- **O que faz**: (mesma skill também listada em Misc) — migra testes de `as` para `@total-typescript/shoehorn`. Duplicação de listagem, não de skill.
- **Como invocar**: veja `misc.md`.

## review-resume

- **O que faz**: (também em Misc) — revisão de currículo PM. Ver `misc.md`.

## obsidian-vault

- **O que faz**: busca, cria e gerencia notas no vault Obsidian com wikilinks e index notes.
- **Como invocar**: automático — "procure/faça notas no Obsidian".
- **Quando usar**: usuário mantém conhecimento em vault Obsidian.
- **Quando NÃO usar**: sem vault Obsidian.
- **Exemplo**: "crie nota de reunião" → nota com wikilinks para conceitos, atualiza index.

## to-questionnaire

- **O que faz**: transforma uma decisão que você não consegue responder totalmente em um questionário para outra pessoa preencher.
- **Como invocar**: automático — "vire isso em questionário".
- **Quando usar**: decisão bloqueada por info que só alguém tem; preparar entrevista estruturada.
- **Quando NÃO usar**: você pode responder a decisão.
- **Exemplo**: "quais prioridades do CER?" → questionário para o coordenador do CER.

## writing-beats

- **O que faz**: (exploit) monta material bruto em uma jornada de beats — cena por cena, cada termo ancorado antes de o beat depender dele.
- **Como invocar**: automático — "monte os beats", "estrutura em cenas".
- **Quando usar**: material bruto pronto, precisa virar narrativa estruturada (palestra, post, artigo).
- **Quando NÃO usar**: material ainda fragmentado sem estrutura (use `writing-fragments`).
- **Exemplo**: material bruto sobre reabilitação → beats de palestra com ancoragem de termos.

## writing-fragments

- **O que faz**: (explore) mina fragmentos brutos sem estrutura ainda.
- **Como invocar**: automático — "explore esses fragmentos", "ideias soltas".
- **Quando usar**: material caótico antes de decidir forma.
- **Quando NÃO usar**: material já estruturado (use `writing-beats`).
- **Exemplo**: notas soltas de entrevistas → fragmentos agrupados por tema.

## Limitações do grupo

- **Experimental** — APIs/formatos podem mudar; trate como não-estável.
- **Várias skills duplicadas entre grupos** (review-resume, migrate-to-shoehorn) — sinal de re-organização em andamento no plugin.
- **claude-handoff e find-skills** têm acoplamento ao ecossistema Claude/Agents — podem não se comportar igual no OpenCode.