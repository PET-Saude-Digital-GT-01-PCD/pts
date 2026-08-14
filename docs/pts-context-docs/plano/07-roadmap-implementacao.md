# 07 — Roadmap de Implementação

> **Input:** `04`, `05`, `06` · **Skills:** `outcome-roadmap`, `sprint-plan`, `stakeholder-map`, `to-tickets`

## 1. Objetivo

Transformar a visão (doc 04) e a especificação (docs 05–06) em um caminho executável: fases, marcos, capacidade, critérios de go/no-go e plano de piloto em CER real.

## 2. Princípios do Roadmap

- **Outcome-first:** cada fase declara o resultado de negócio que entrega, não apenas o conjunto de features.
- **Piloto cedo e curto:** o valor precisa ser provado no cotidiano do CER em ≤ 90 dias de uso.
- **Foco no núcleo:** nada de módulo 6 completo ou especialidades extras antes da dor central resolvida.
- **Capacidade honesta:** em contexto acadêmico, time reduzido e com muitas restrições — o roadmap respeita isso.

## 3. Fases do Roadmap

### Fase 0 — Validação do Problema e Viabilidade *(2–6 semanas)*

| Entregável | Outcome | Saída |
|---|---|---|
| Entrevistas com 3–5 profissionais de CER | Dor central confirmada ou rejeitada | Relatório curto (doc 03 revalidado) |
| Checagem de acesso à API e-SUS PEC | Viabilidade técnica da integração comprovada | Documento de viabilidade + contatos na secretaria |
| Protótipo de papel/tela (M1–M2) | Profissionais reagem ao fluxo proposto | Prints + feedback registrado |
| Teste de aceite de consentimento LGPD digital | Cuidadores aceitam assinar em dispositivo | Observação de campo |

**Go/No-Go da Fase 0:** entrevistas confirmam dor A1; acesso à API A5 tecnicamente possível; consentimento digital A7 aceito. **No-Go** → pivotar escopo (ex.: começar pelo M5/M3 offline sem integração) e retornar à doc 08.

### Fase 1 — MVP Piloto *(12–16 semanas)*

Build dos módulos 1, 2, 3 e 5 (núcleo) + módulo 4 (Fisio/TO essencial) conforme doc 05.7.2. Implementação em **1 CER real**.

| Entrega (resultado) | Critérios de aceite (resumo) |
|---|---|
| M1 — Recepção: linha de base auto-importada | Tempo de recepção ≤ 2 min; ≥ 90% casos com base importada |
| M2 — Triagem: semáforo + contrarreferência | Fila priorizada com tempo estimado; ajustes auditados |
| M3 — SOAP + divergência saudável | Registro médico estruturado; painel ativo |
| M5 — Mural + metas cruzadas | Discussão assíncrona em uso; metas documentadas |
| M4 — Avaliação Fisio/TO preditiva | CIF gerada a partir de checklist |

**Piloto desenhado com:**
- **Sponsor clínico:** enfermeiro/profissional de referência do CER (ponte cotidiano × time).
- **Grupo de adoção inicial:** 2–3 profissionais voluntários (fisioterapeuta, médico, recepção).
- **Ambiente controlado:** começar por um turno/categoria, expandir após validação.
- **Coleta de linha de base pré-piloto:** medir tempos e fluxos antes da implantação (necessário para comparativo do doc 09).

### Fase 2 — Expansão do Núcleo e Governança *(8–12 semanas)*

- Módulo 6 completo (dashboards de gestão, auditoria, sincronização de agendas).
- Módulo 4 ampliado: todas as especialidades (Psicologia, demais).
- Contrarreferência plena à APS (integração completa de escrita no e-SUS).
- Ajustes de usabilidade com base no uso real do piloto.

**Resultado:** ciclo de vida completo do PTS operado digitalmente no CER-piloto.

### Fase 3 — Escalonamento *(contínuo, condicionado)*

- Pacote de replicação: manual de implantação, treinamento, playbook de integração.
- Expansão para 2–3 CER adicionais com curva de aprendizado medida.
- Condição: indicadores do piloto atendidos (doc 09) + capacidade de manutenção definida (doc 10).

## 4. Marcos e Dependências

| Marco | Depende de | Critério de saída |
|---|---|---|
| M0.1 Viabilidade de API confirmada | Secretaria municipal; e-SUS | Documento de acesso assinado |
| M0.2 Adesão do CER-piloto | Sponsor clínico; gestão do CER | Termo de parceria (acadêmico + serviço) |
| M1.1 Recepção em produção no piloto | M0.1, M0.2 | 2 semanas de uso estável |
| M1.2 Fluxo completo M1–M3 em uso | M1.1 | ≥ 20 casos conduzidos |
| M1.3 Cogestão (M5) ativa | M1.2 | ≥ 10 metas pactuadas e visíveis |
| M2.1 Governança (M6) entregue | Fase 1 completa | Dashboard consumido por gestor |
| M3.1 Expansão para novos CER | M2.1 + indicadores ok | 2 CER adicionais em produção |

## 5. Capacidade e Riscos de Execução

**Contexto de capacidade (projeto acadêmico):**

| Fator | Realidade | Mitigação |
|---|---|---|
| Time | Estudo + extensão; horas limitadas | Fase 0 curta; MVP mínimo viável (M1–M3+M5) |
| Infraestrutura | Sem servidor próprio garantido | Opção de hospedagem leve/open source; dados locais no CER |
| Conhecimento técnico | Em formação | Fase 0 funciona como aprendizado estruturado; integração dividida em tarefas pequenas (to-tickets) |
| Sustentação | Sem equipe dedicada pós-entrega | Doc 10 define modelo (universidade + bolsas + CER coprodutor) |

**Riscos de cronograma:** acesso à API (A5) e adesão do CER (M0.2) são os dois caminhos críticos — começá-los primeiro (Fase 0). Atrasos em integração não bloqueiam os módulos offline (M5, M3) — sequenciamento tolerante a risco.

## 6. Stakeholders e Envolvimento

| Stakeholder | Interesse | Envolvimento necessário | Canal |
|---|---|---|---|
| Secretaria de Saúde | Melhoria do serviço, baixo custo | Autorização de integração e-SUS | Reunião formal + termo |
| Gestor do CER | Indicadores, fila, carga de equipe | Sponsorship, acesso a dados | Reuniões quinzenais |
| Sponsor clínico (enfermagem) | Cotidiano funcionando | Teste no dia a dia, feedback | Semanal |
| Profissionais (Fisio/Médico/Recepção) | Menos retrabalho | Cocriação e adoção | Oficinas + piloto |
| Usuários/cuidadores | Percurso claro | Participação em testes de consentimento | Observação de campo |
| Orientadores/academia | Rigor metodológico | Revisão de marcos | Entrega por fase |

## 7. Rituais do Projeto

| Ritual | Cadência | Propósito |
|---|---|---|
| Revisão de indicadores | Quinzenal | Acompanhar KRs do piloto (doc 09) |
| Sprint/entrega de valor | Semanal | Feature ou melhoria usável |
| Retrospectiva | A cada fase | Aprender e ajustar (doc 10) |
| Red-teaming | Antes de cada go/no-go | Atacar assumptions antes de avançar (doc 08) |

## 8. Go/No-Go Decisões (resumo)

| Ponto | Pergunta | Decisão se NÃO |
|---|---|---|
| Fim da Fase 0 | Dor real? API viável? Consentimento aceito? | Pivotar escopo (offline-first; sem integração) |
| Fim da Fase 1 | Indicadores do piloto ok? Uso ≥ 70%? | Estender piloto 1 ciclo; corrigir usabilidade |
| Fim da Fase 2 | Ciclo completo operado? Gestor consome dashboards? | Refinar antes de escalar |
| Fase 3 (a cada CER) | Custo de replicação caindo? | Consolidar playbook antes de continuar |