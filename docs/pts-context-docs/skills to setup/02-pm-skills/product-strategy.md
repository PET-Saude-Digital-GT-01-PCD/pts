# PM Skills — Product Strategy (12)

Estratégia de produto: visão, canvas estratégicos, análise de ambiente, precificação e proposta de valor. Base: Paweł Huryn (Product Strategy Canvas, Startup Canvas), Alexander Osterwalder (BMC), Ash Maurya (Lean Canvas), Michael Porter, Henry Mintzberg.

## Fluxo típico

```
product-vision → product-strategy → startup-canvas / business-model / lean-canvas
          ↘ swot-analysis → pestle-analysis → porters-five-forces → ansoff-matrix
          ↘ value-proposition → value-prop-statements / positioning-ideas
          ↘ pricing-strategy / monetization-strategy
```

---

## ansoff-matrix

- **O que faz**: matriz 2×2 (Produto × Mercado) mapeando 4 estratégias de crescimento (Penetração, Desenvolvimento de Mercado, Desenvolvimento de Produto, Diversificação), com táticas, exemplos, risco e timeline.
- **Como invocar**: automático — "matriz de Ansoff", "opções de crescimento".
- **Quando usar**: decidir entre crescer em mercado atual vs expandir; planejar expansão.
- **Quando NÃO usar**: problema não é de crescimento de portfólio.
- **Exemplo**: PTS Digital → penetração (mais CERs adotando módulos atuais) vs desenvolvimento de produto (novos módulos de contrarreferência).

## business-model

- **O que faz**: Business Model Canvas completo, 9 blocos (parceiros, atividades, recursos, proposta de valor, relacionamento, canais, segmentos, custos, receita).
- **Como invocar**: automático — "business model canvas", "BMC".
- **Quando usar**: negócio estabelecido, estratégia corporativa, material para investidor.
- **Quando NÃO usar**: produto novo que precisa de clareza estratégica + modelo (use `startup-canvas`); teste rápido de hipótese (use `lean-canvas`).
- **Exemplo**: BMC do PTS Digital com parceiros (SUS, CERs, e-SUS PEC) e receita (convênios, SaaS público).

## lean-canvas

- **O que faz**: canvas Lean (Ash Maurya) — 9 blocos trocando Parceiros/Atividades/Recursos por Problema/Solução/Vantagem Injusta.
- **Como invocar**: automático — "lean canvas", "hipótese de negócio".
- **Quando usar**: teste rápido de hipótese, speed over completeness, brainstorm.
- **Quando NÃO usar**: documento estratégico (o próprio SKILL.md lista limitações: redundância Problema×Segmentos, Solução×Value Prop, sem visão/trade-offs/metrics).
- **Exemplo**: hipótese "CERs adotam plataforma PTS se reduzir retrabalho de registro e-SUS".

## monetization-strategy

- **O que faz**: brainstorm de 3-5 estratégias de monetização (freemium, subscription, usage-based, seat, one-time, marketplace, ads) com fit de audiência, unit economics, riscos e experimento de validação.
- **Como invocar**: automático — "como monetizar", "modelo de receita".
- **Quando usar**: explorar modelos de receita, decidir como cobrar.
- **Quando NÃO usar**: preço já definido e só falta estrutura de tiers (use `pricing-strategy`).
- **Exemplo**: SaaS de gestão → freemium + subscription enterprise; experimento de waitlist para validar WTP.

## pestle-analysis

- **O que faz**: análise PESTLE — fatores Políticos, Econômicos, Sociais, Tecnológicos, Legais, Ambientais; 3-5 fatores por categoria, impacto × probabilidade, respostas estratégicas.
- **Como invocar**: automático — "PESTLE", "macro ambiente".
- **Quando usar**: entrada em mercado, planejamento estratégico, avaliação de riscos externos.
- **Quando NÃO usar**: micro ambiente (use `porters-five-forces`/`swot-analysis`).
- **Exemplo**: PTS Digital → Legal (LGPD, portarias do SUS), Político (políticas de reabilitação), Social (envelhecimento, demanda de reabilitação).

## porters-five-forces

- **O que faz**: análise das 5 forças de Porter (rivalidade, poder de fornecedores, poder de compradores, ameaça de substitutos, ameaça de entrantes), com sinais de força alta/baixa e implicações estratégicas.
- **Como invocar**: automático — "5 forças de Porter", "análise da indústria".
- **Quando usar**: avaliar atratividade estrutural de uma indústria, dinâmica competitiva.
- **Quando NÃO usar**: macro ambiente (use `pestle-analysis`).
- **Exemplo**: saúde pública → poder de comprador (governo) alto, entrantes barrados por regulação/licenciamento.

## pricing-strategy

- **O que faz**: estratégia de pricing completa: valor entregue, modelos (flat/seat/usage/tiered/freemium/value-based), análise competitiva, estrutura de tiers, sensibilidade de preço (Van Westendorp), experimentos.
- **Como invocar**: automático — "estratégia de preço", "definir preço".
- **Quando usar**: definir preço, mudar preço, comparar freemium vs pago.
- **Quando NÃO usar**: decidir modelo de negócio inteiro (use `monetization-strategy`).
- **Exemplo**: plataforma PTS → tiered por nº de profissionais (CER pequeno/médio/grande), value metric = profissionais ativos.

## product-strategy

- **O que faz**: Product Strategy Canvas de 9 seções (Visão, Segmentos, Custos Relativos, Value Prop, Trade-offs, Métricas, Crescimento, Capacidades, Can't/Won't) + hipóteses críticas e experimentos.
- **Como invocar**: automático — "estratégia de produto", "strategy canvas".
- **Quando usar**: definir direção do produto, criar documento estratégico.
- **Quando NÃO usar**: produto novo só com modelo de negócio (use `startup-canvas`).
- **Exemplo**: estratégia PTS Digital — trade-offs explícitos (não fazer teleatendimento), NSM, defensibilidade.

## product-vision

- **O que faz**: brainstorm de visão de produto inspiradora, alcançável e emocional; 3-5 variações, seleciona a mais forte com rationale.
- **Como invocar**: automático — "visão de produto", "vision statement".
- **Quando usar**: definir/refinar visão, alinhar time.
- **Quando NÃO usar**: precisa de estratégia detalhada (use `product-strategy`).
- **Exemplo**: visão PTS Digital — "todo PCD tem um PTS vivo e coparticipado, sem burocracia".

## startup-canvas

- **O que faz**: Startup Canvas (Huryn) — 9 seções de estratégia + Modelo de Negócio (custo + receita). Separa estratégia de modelo.
- **Como invocar**: automático — "startup canvas", "canvas de produto novo".
- **Quando usar**: produto novo que precisa de clareza estratégica E modelo de negócio (recomendado).
- **Quando NÃO usar**: teste rápido (use `lean-canvas`); empresa estabelecida (use `business-model`).
- **Exemplo**: PTS Digital como startup → visão + segmentos + value prop + custo (infra, equipe) + receita (SaaS público/convênios).

## swot-analysis

- **O que faz**: SWOT completo — 5-7 itens por quadrante (Forças/Fraquezas/Oportunidades/Ameaças), cross-reference e 3-5 recomendações estratégicas.
- **Como invocar**: automático — "SWOT", "forças e fraquezas".
- **Quando usar**: avaliação estratégica, posição competitiva, revisão trimestral.
- **Quando NÃO usar**: macro só (use `pestle-analysis`); indústria só (use `porters-five-forces`).
- **Exemplo**: SWOT do PTS Digital — força (integração e-SUS), fraqueza (dependência de adoção CER), oportunidade (política de reabilitação), ameaça (resistência a mudança de workflow).

## value-proposition

- **O que faz**: proposta de valor em template de 6 partes com JTBD (Who, Why, What before, How, What after, Alternatives) — vs o canvas da Strategyzer, que começa pelo produto.
- **Como invocar**: automático — "value proposition", "proposta de valor".
- **Quando usar**: articular por que clientes escolheriam você; uma segmento por passada.
- **Quando NÃO usar**: decomposição de pains/gains de produto maduro com necessidades complexas (canvas Strategyzer).
- **Exemplo**: PTS Digital — Who (equipes multiprofissionais de CER), What before (registros fragmentados), What after (PTS vivo coparticipado).

## Limitações do grupo

- **Ferramentas de pensamento, não fatos.** Canvas e análises organizam discussão; dependem da qualidade das entradas.
- **PESTLE/SWOT/5 Forças geram listas longas** — o valor está na síntese estratégica e priorização, que dependem do usuário.
- **Canvases têm visões concorrentes** (BMC vs Lean vs Startup). O próprio plugin recomenda: Startup Canvas para produto novo; Lean para rapidez; BMC para corporativo.
- **Análises macro devem ser reavaliadas** (o plugin sugere anualmente ou quando o mercado mudar) — são instantâneos.