# PM Skills — Product Discovery (13)

Descoberta contínua de produto: transformar problemas de cliente em oportunidades priorizadas e experimentos validados. Base metodológica: Teresa Torres (*Continuous Discovery Habits*), Dan Olsen (*Lean Product Playbook*), Alberto Savoia (*The Right It*), Product Trio.

## Fluxo típico

```
identify-assumptions-* → prioritize-assumptions → brainstorm-experiments-*
                                            ↘ brainstorm-ideas-* → prioritize-features
interview-script → summarize-interview → opportunity-solution-tree
```

---

## analyze-feature-requests

- **O que faz**: categoriza, avalia e prioriza pedidos de features de clientes contra metas do produto; top 3 com rationale, alternativas, riscos e como testar.
- **Como invocar**: automático — "analise esses pedidos de features", "trie o backlog de pedidos".
- **Quando usar**: revisar pedidos de clientes, triar backlog, decidir o que construir.
- **Quando NÃO usar**: pedidos já priorizados; quando você só quer ranking numérico (use `prioritize-features`).
- **Exemplo**: colar lista de 40 pedidos de usuários + objetivo do produto → tema, alinhamento estratégico, top 3.
- **Base**: Opportunity Score (Importance × (1 − Satisfaction)).

## brainstorm-ideas-existing

- **O que faz**: ideias para produto **existente** sob 3 perspectivas (PM/Designer/Engenheiro), 5 cada, prioriza top 5.
- **Como invocar**: automático — "preciso de ideias de feature para X".
- **Quando usar**: produto vivo, discovery contínua, Product Trio.
- **Quando NÃO usar**: produto novo sem dados (use `brainstorm-ideas-new`).
- **Exemplo**: "queremos aumentar retenção de 7 dias para PCDs no app PTS" → 15 ideias de 3 ângulos, top 5.

## brainstorm-ideas-new

- **O que faz**: ideias de features para produto **novo** em discovery inicial; 5 ideias por perspectiva (PM/Designer/Engenheiro), top 5.
- **Como invocar**: automático — "ideias para meu produto novo X".
- **Quando usar**: antes de validar mercado, explorar conceito.
- **Quando NÃO usar**: produto existente (use `brainstorm-ideas-existing`); quando a pergunta é demanda, não features (use `brainstorm-experiments-new`).
- **Exemplo**: "plataforma de gestão de PTS para CERs" → ideias de módulos, priorizadas por valor central e velocidade de validação.

## brainstorm-experiments-existing

- **O que faz**: desenha experimentos de baixo esforço para validar assumptions de produto existente: first-click, fake door, spikes, A/B, Wizard of Oz, surveys comportamentais.
- **Como invocar**: automático — "como validar isso barato?", "desenhe experimentos para".
- **Quando usar**: feature com assumptions não testadas, quer validar antes de implementar.
- **Quando NÃO usar**: produto novo sem mercado (use `brainstorm-experiments-new`).
- **Exemplo**: assumption "profissionais de saúde vão preencher metas do PTS" → experimento com métrica e limiar de sucesso.

## brainstorm-experiments-new

- **O que faz**: hipóteses XYZ ("pelo menos X% de Y farão Z") + 2-3 pretotipos (landing page, vídeo, email, pré-venda, concierge).
- **Como invocar**: automático — "valide meu produto novo", "pretotipo".
- **Quando usar**: produto novo, validar demanda e disposição a pagar antes de construir.
- **Quando NÃO usar**: produto existente com features (use `brainstorm-experiments-existing`).
- **Exemplo**: "20% de CERs farão pré-cadastro na landing em 30 dias" → landing page + espera com métrica.

## identify-assumptions-existing

- **O que faz**: devil's advocate em 3 perspectivas; assumptions de risco em 4 áreas (Valor, Usabilidade, Viabilidade, Factibilidade), com confiança e teste sugerido.
- **Como invocar**: automático — "stress-test essa feature", "quais as assumptions arriscadas".
- **Quando usar**: antes de priorizar experimentos; revisar design/PRD.
- **Quando NÃO usar**: produto novo (use `identify-assumptions-new`).
- **Exemplo**: feature "pactuação digital de metas" → assumptions de valor/usabilidade/viabilidade/factibilidade.

## identify-assumptions-new

- **O que faz**: 8 categorias de risco (4 core + Ética, Go-to-Market, Estratégia & Objetivos, Time).
- **Como invocar**: automático — "avalie os riscos do meu produto novo".
- **Quando usar**: startup/conceito novo; "três-quartos das ideias falham — saiba quais são as suas".
- **Quando NÃO usar**: feature em produto existente (use `identify-assumptions-existing`).
- **Exemplo**: avaliar conceito PTS Digital → GTM, ética (dados de saúde), time, viabilidade.

## prioritize-assumptions

- **O que faz**: matriz Impact × Risco; categoriza assum. em 4 quadrantes (testar / implementar / rejeitar / adiar) e sugere experimento para cada uma que merece teste.
- **Como invocar**: automático — "priorize essas assumptions", "qual assumption testar primeiro".
- **Quando usar**: lista de assumptions pronta (saída de `identify-assumptions-*`).
- **Quando NÃO usar**: features (use `prioritize-features`).
- **Exemplo**: alimentar com lista do identify-assumptions-new → matriz 2×2 → qual testar esta semana.

## prioritize-features

- **O que faz**: avalia e ranqueia backlog de features por Impacto, Esforço, Risco e alinhamento; top 5 com rationale.
- **Como invocar**: automático — "priorize esse backlog", "top 5 features".
- **Quando usar**: backlog de features, decisões de escopo.
- **Quando NÃO usar**: problemas de cliente (use Opportunity Score via `analyze-feature-requests`); assum. (use `prioritize-assumptions`).
- **Exemplo**: 20 features → tabela de priorização → top 5 + o que foi depriorizado e por quê.

## opportunity-solution-tree

- **O que faz**: árvore de 4 níveis (Outcome desejado → Oportunidades → Soluções → Experimentos) — espinha dorsal da discovery contínua.
- **Como invocar**: automático — "monte a OST", "árvore de oportunidade".
- **Quando usar**: estruturar discovery; mapear problema→solução; decidir o que construir.
- **Quando NÃO usar**: problema já resolvido com solução clara (árvore é overkill).
- **Exemplo**: outcome "aumentar 7-dia retention para 40%" → 3-7 oportunidades de cliente → 3+ soluções por oportunidade → experimentos.

## interview-script

- **O que faz**: roteiro de entrevista estruturado (abertura, warm-up, exploração JTBD, técnicas de probing, regras do Mom Test) + template de anotações.
- **Como invocar**: automático — "crie um roteiro de entrevista", "Mom Test".
- **Quando usar**: preparar discovery research com usuários.
- **Quando NÃO usar**: dados quantitativos (use data-analytics).
- **Exemplo**: roteiro para entrevistar fisioterapeutas de CER sobre registro de PTS — perguntas sobre o passado, nunca "você usaria X?".

## summarize-interview

- **O que faz**: transforma transcrição de entrevista em resumo estruturado (data, participantes, solução atual, JTBD, problemas, insights-chave, ações).
- **Como invocar**: automático — "resuma essa entrevista".
- **Quando usar**: processar transcrições/gravações de entrevistas.
- **Quando NÃO usar**: reunião interna (use `summarize-meeting`).
- **Exemplo**: transcrição de 40 min → template preenchido com ação "2026-08-15, equipe, validar disposição a pagar por módulo de metas".

## metrics-dashboard

- **O que faz**: desenha dashboard de métricas: North Star + input metrics + health + business; cada métrica com definição, fonte, visualização, alvo, alerta.
- **Como invocar**: automático — "desenhe o dashboard de métricas".
- **Quando usar**: definir KPIs, montar analytics, plano de monitoramento.
- **Quando NÃO usar**: escolher NSM em si (use `north-star-metric`).
- **Exemplo**: NSM "PTS ativos por CER" + inputs + guardrails (latência, erros, NPS) + cadência de review diária/semanal/mensal.

## Limitações do grupo

- **Dependem do usuário fornecer contexto real.** Skills de discovery assumem dados; sem dados, geram hipóteses — marque-as como tal.
- **Base teórica ocidental/startup.** JTBD, Opportunity Score, pretotipos pressupõem contexto SaaS/PMF. Para setores regulados (saúde, como PTS/CER), adapte termos.
- **Não executam a pesquisa** — só desenham roteiros/experimentos; a entrevista e o experimento são feitos por humanos.