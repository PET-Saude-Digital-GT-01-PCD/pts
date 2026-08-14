# Matt Pocock — Productivity (5)

Ferramentas de fluxo de trabalho gerais, não específicas de código.

## Invocação

- **User-invoked**: `grill-me`, `handoff`, `teach`, `writing-great-skills`
- **Model-invoked**: `grilling`

---

## grill-me

- **O que faz**: fachada de `/grilling` — entrevista implacável sobre um plano/design até todos os ramos da árvore de decisão estarem resolvidos. Não deixa paper trail.
- **Como invocar**: `/grill-me`.
- **Quando usar**: uso não-código; sem codebase; quer alinhar antes de agir.
- **Quando NÃO usar**: tem codebase e quer docs de domínio (use `/grill-with-docs`).
- **Exemplo**: "vou fazer um workshop sobre PTS, me alinhe" → perguntas uma a uma com resposta recomendada.

## grilling

- **O que faz**: o loop reutilizável por trás de `grill-me` e `grill-with-docs`. Entrevista o usuário implacavelmente, uma pergunta por vez, cada uma com resposta recomendada; factos são achados no ambiente (não perguntados); decisões são do usuário. Não age até shared understanding.
- **Como invocar**: automático — "grille-me", "stress-test meu plano", "vamos alinhar".
- **Quando usar**: stress-test de plano/ideia/decisão; base de qualquer grilling.
- **Quando NÃO usar**: você só quer executar (grilling trava o start até alinhar).
- **Exemplo**: plano de lançamento → pergunta 1 "qual métrica decide go/no-go?" com recomendação; espera resposta; continua.

## handoff

- **O que faz**: comprime a conversa atual em documento de handoff para outro agente continuar. Salva no dir temporário do SO (não no workspace); inclui seção "suggested skills"; não duplica artefatos (referencia por path); redige secrets/PII.
- **Como invocar**: `/handoff`.
- **Quando usar**: contexto acabando, troca de sessão/agente, trabalho multi-sessão.
- **Quando NÃO usar**: trabalho termina nesta sessão.
- **Exemplo**: contexto perto do smart zone → `/handoff` → continua em sessão fresca com o doc.

## teach

- **O que faz**: ensina skill/conceito ao usuário em **múltiplas sessões**, usando o diretório atual como workspace de ensino stateful: `MISSION.md`, `reference/*.html` (cheat sheets), `RESOURCES.md`, `learning-records/*.md` (tipo ADR de aprendizado), `lessons/*.html` (lições autônomas), `assets/`, `NOTES.md`.
- **Como invocar**: `/teach <tópico>`.
- **Quando usar**: usuário quer aprender algo ao longo do tempo (não tutorial único).
- **Quando NÃO usar**: pergunta pontual respondida na hora.
- **Exemplo**: "me ensine SQL" → missão documentada, recursos de alta qualidade (não confiar no conhecimento paramétrico), lições HTML por tópico, records de aprendizado.

## writing-great-skills

- **O que faz**: referência para escrever/editar skills bem — o vocabulário e princípios que tornam uma skill previsível: invocação (model vs user), hierarquia de informação (steps vs referência, progressive disclosure), quando dividir (por invocação ou sequência), pruning, leading words, failure modes (premature completion, duplication, sediment, sprawl, no-op, negation).
- **Como invocar**: `/writing-great-skills` (user-invoked; também é referência consultada ao escrever skills).
- **Quando usar**: criar/editar skill; diagnosticar skill que não funciona.
- **Quando NÃO usar**: apenas usar skills existentes.
- **Exemplo**: skill nova que o agente sempre termina cedo → diagnóstico: completion criterion vago → sharpening.

## Limitações do grupo

- **grilling/grit-me são intensos** — exigem usuário com tempo e paciência; para pressa use `to-spec` (sem entrevista).
- **handoff é unidirecional** — produz doc; outro agente precisa ser iniciado com ele.
- **teach é stateful e exige disciplina** — workspace vira responsabilidade de manutenção.
- **writing-great-skills é metasskill** — valor só para quem escreve skills.