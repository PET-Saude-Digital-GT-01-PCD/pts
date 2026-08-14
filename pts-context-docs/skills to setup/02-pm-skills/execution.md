# PM Skills — Execution (16)

Execução de produto: transformar estratégia em trabalho entregue — PRD, backlog, OKRs, planejamento, retrospectivas, gestão de risco e comunicação.

## Fluxo típico

```
create-prd → wwas / user-stories / job-stories → prioritize → sprint-plan → retro
brainstorm-okrs → outcome-roadmap
pre-mortem / strategy-red-team → planos de mitigação
```

---

## brainstorm-okrs

- **O que faz**: gera 3 conjuntos alternativos de OKRs para o time, alinhados à estratégia da empresa; objetivo qualitativo + 3 Key Results quantitativos (60-70% de confiança).
- **Como invocar**: automático — "OKRs do time", "defina OKRs".
- **Quando usar**: definir OKRs trimestrais, alinhar metas do time.
- **Quando NÃO usar**: precisa de NSM (use `north-star-metric`); PRD (use `create-prd`).
- **Exemplo**: Objetivo "Onboarding sem atrito" → KRs (CSAT ≥75%, 66% onboarding em 2 dias, ...).

## create-prd

- **O que faz**: PRD de 8 seções (Resumo, Contatos, Background, Objetivo + Key Results, Segmentos, Value Props, Escopo/Fora de escopo, Release plan).
- **Como invocar**: automático — "escreva um PRD", "feature spec".
- **Quando usar**: documentar requisitos, alinhar stakeholders, especificar feature.
- **Quando NÃO usar**: conversa que só precisa virar spec de engenharia (mattpocock `to-spec`); backlog item pequeno (use `wwas`).
- **Exemplo**: PRD do módulo de pactuação de metas do PTS Digital.

## dummy-dataset

- **O que faz**: gera datasets fictícios realistas (CSV, JSON, SQL, script Python) com colunas, constraints e nº de linhas configuráveis.
- **Como invocar**: automático — "gere dados fictícios de X".
- **Quando usar**: testar, mockar dados, popular ambiente de dev/demo.
- **Quando NÃO usar**: precisa de dados reais/anônimos de produção.
- **Exemplo**: 500 registros de PTS fictícios (CSV) para testar dashboard.

## job-stories

- **O que faz**: job stories no formato "When [situação], I want to [motivação], so I can [resultado]" com critérios de aceitação detalhados; foca na situação, não no papel.
- **Como invocar**: automático — "job stories", "backlog baseado em JTBD".
- **Quando usar**: expressar situações/motivações de usuário, JTBD-style backlog.
- **Quando NÃO usar**: backlog estruturado para eng (use `wwas` ou `user-stories`).
- **Exemplo**: "When organizando PTS de PCD, quero ver histórico de avaliações, para decidir metas sem reavaliar".

## outcome-roadmap

- **O que faz**: transforma roadmap orientado a output em orientado a outcome; reescreve iniciativas como "Enable [segmento] to [outcome] so that [impacto]".
- **Como invocar**: automático — "transforme o roadmap", "roadmap de outcomes".
- **Quando usar**: mudar para roadmap estratégico, comunicar intenção, evitar falsa precisão de features.
- **Quando NÃO usar**: roadmap já é outcome-based.
- **Exemplo**: "Q2: build search filters" → "Q2: Enable profissionais a encontrar pacientes 50% mais rápido".

## pre-mortem

- **O que faz**: pre-mortem — imagina o lançamento fracassado e trabalha para trás; categoriza riscos em Tigers (reais), Paper Tigers (superestimados), Elephants (não discutidos); classifica urgência (launch-blocking / fast-follow / track).
- **Como invocar**: automático — "pre-mortem", "o que pode dar errado no lançamento".
- **Quando usar**: antes de lançar, stress-test PRD/plano.
- **Quando NÃO usar**: quer atacar assumptions agora (use `strategy-red-team` — é complementar, não substituto).
- **Exemplo**: pre-mortem do PTS Digital → Tiger launch-blocking (integração e-SUS não pronta), Elephant (resistência de profissionais).

## prioritization-frameworks

- **O que faz**: guia de referência de 9 frameworks de priorização (Opportunity Score, ICE, RICE, Eisenhower, Impact×Effort, Kano, MoSCoW, etc.) com fórmulas e quando usar.
- **Como invocar**: automático — "qual framework de priorização", "RICE vs ICE".
- **Quando usar**: escolher método de priorização; aprender fórmulas.
- **Quando NÃO usar**: priorizar uma lista específica (use `prioritize-features`/`prioritize-assumptions`).
- **Exemplo**: referência das fórmulas ICE = Impacto(Opportunity Score × nº clientes) × Confiança × Facilidade.

## release-notes

- **O que faz**: transforma tickets/changelogs técnicos em release notes user-facing: categoriza (novas features, melhorias, fixes, breaking, depreciações), lidera com benefício do usuário.
- **Como invocar**: automático — "escreva as release notes".
- **Quando usar**: anunciar atualização, criar changelog, resumir o que shipou.
- **Quando NÃO usar**: nota interna técnica (que aí é changelog bruto).
- **Exemplo**: "Redis cache para endpoints" → "Dashboards carregam até 3× mais rápido".

## retro

- **O que faz**: facilita retrospectiva estruturada — 3 formatos (Start/Stop/Continue, 4Ls, Sailboat), análise do sprint, 2-3 action items priorizados com dono, deadline e métrica.
- **Como invocar**: automático — "retro", "retrospectiva do sprint".
- **Quando usar**: refletir sobre sprint, gerar melhorias acionáveis.
- **Quando NÃO usar**: planning (use `sprint-plan`).
- **Exemplo**: retro do time PTS → 3 actions (mover code review mais cedo, definir Definition of Ready, automatizar e2e).

## sprint-plan

- **O que faz**: planeja sprint: capacidade do time (velocidade, buffer 15-20%), seleção de stories, mapeamento de dependências, riscos, plano sumário.
- **Como invocar**: automático — "planeje o sprint", "sprint planning".
- **Quando usar**: preparar sprint planning, estimar capacidade, selecionar stories.
- **Quando NÃO usar**: visão do sprint futuro longo prazo (use `outcome-roadmap`).
- **Exemplo**: sprint PTS Digital — capacidade 40 pts, buffer 8, stories priorizadas, dependência com time de e-SUS.

## stakeholder-map

- **O que faz**: mapeia stakeholders em grade Poder × Interesse; estratégia de comunicação por quadrante (Manage Closely / Keep Satisfied / Keep Informed / Monitor) + plano de comunicação.
- **Como invocar**: automático — "stakeholder map", "quem gerenciar".
- **Quando usar**: gerenciar stakeholders, preparar launch, alinhar times cross-funcionais.
- **Quando NÃO usar**: questão de produto puro sem stakeholders cross-funcionais.
- **Exemplo**: PTS Digital → Ministério da Saúde (manter satisfeito), coordenações de CER (gerenciar de perto).

## strategy-red-team

- **O que faz**: ataca assumptions load-bearing de PRD/roadmap/estratégia: extrai claims, steelman + ataca, escreve "Fails if ___", ranqueia por impacto × probabilidade × custo de teste, dá evidência desta semana + kill criterion + teste mais barato.
- **Como invocar**: automático — "red team nesse plano", "stress-test a estratégia".
- **Quando usar**: antes de revisão executiva, pressionar plano, desafiar assumptions.
- **Quando NÃO usar**: quer risco de lançamento (use `pre-mortem`). Red team ≠ pre-mortem — ataca agora, não narra falha futura.
- **Exemplo**: claim "CERs adotarão sem incentivo financeiro" → "Fails if adoção < 20% em 3 meses" → teste: pilotos em 3 CERs.

## summarize-meeting

- **O que faz**: resumo estruturado de reunião (data, participantes, tópico, pontos, decisões, action items com dono/data).
- **Como invocar**: automático — "resuma essa reunião".
- **Quando usar**: processar transcrição/notas de reunião.
- **Quando NÃO usar**: entrevista de usuário (use `summarize-interview`).
- **Exemplo**: reunião de governança → decisões + actions com donos.

## test-scenarios

- **O que faz**: gera cenários de teste completos a partir de user stories: objetivo, condições iniciais, papel, passos, resultados esperados, edge cases.
- **Como invocar**: automático — "cenários de teste", "casos de teste QA".
- **Quando usar**: escrever planos de teste, validar implementação de story.
- **Quando NÃO usar**: TDD de verdade no código (use `tdd` do mattpocock).
- **Exemplo**: cenário "Ver produtos recentemente vistos" → passos e expected outcomes.

## user-stories

- **O que faz**: user stories com 3 C's (Card, Conversation, Confirmation) e INVEST; template "As a [papel], I want to [ação], so that [benefício]" + critérios de aceitação.
- **Como invocar**: automático — "user stories", "quebre a feature em histórias".
- **Quando usar**: backlog em formato de história, critérios de aceitação.
- **Quando NÃO usar**: item estratégico (use `wwas`); situação/motivação (use `job-stories`).
- **Exemplo**: "Como profissional de reabilitação, quero ver 'recentemente vistos' para reencontrar pacientes".

## wwas

- **O que faz**: backlog items em Why-What-Acceptance: Why estratégico + What conciso + Acceptance Criteria observáveis. Independente, valioso, testável.
- **Como invocar**: automático — "WWA", "backlog items".
- **Quando usar**: comunicar intenção estratégica ao time; itens de backlog de produto.
- **Quando NÃO usar**: story de usuário com critérios detalhados (use `user-stories`).
- **Exemplo**: "Implementar tracker de gastos em tempo real" — Why (consciência financeira), What (reminder da conversa), AC (atualiza em 2s, barra de progresso).

## Limitações do grupo

- **PRD/specs são documentos vivos** — skills geram primeira versão; manutenção é sua.
- **Overlap forte com ecossistema mattpocock** — `create-prd`/`wwas`/`user-stories` competem com `to-spec`/`to-tickets`. Use PM skills para produto/backlog de negócio; mattpocock para spec técnica de engenharia.
- **Pre-mortem vs strategy-red-team** são complementares mas fáceis de confundir — red team ataca assumptions; pre-mortem narra falha futura.
- **Planning/retro assumem processo ágil real** (velocity, sprints) — em projetos sem isso, adapte.