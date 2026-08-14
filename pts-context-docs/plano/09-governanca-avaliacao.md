# 09 — Governança de Métricas e Avaliação de Impacto

> **Input:** `04` (north star/OMTM), `05` (KRs), `06` (indicadores técnicos) · **Skills:** `metrics-dashboard`, `north-star-metric`, `cohort-analysis`

## 1. Objetivo

Definir como saber se a plataforma está entregando valor: métricas boas (que mudam comportamento), dashboards, cadências de revisão e o plano de avaliação de impacto do piloto.

## 2. Metodologia

Métrica boa (Ben Yoskovitz): **compreensível, comparável, é razão/taxa, e muda comportamento**. Norte: single metric centrada no usuário que é indicador-líder de sucesso.

## 3. North Star e Métricas de Entrada

**North Star Metric (NSM):** **% de PTS ativos com revisão em dia e com ≥ 1 meta SMART documentada.**

> Captura o coração do produto: PTS **vivo** (revisado no prazo pactuado) e **pactuado** (metas documentadas). É indicador-líder de cuidado contínuo, e cada um de seus componentes é acionável.

### Input Metrics (levers do NSM)

| Lever | Definição | Por que é lever |
|---|---|---|
| **Cobertura de linha de base** | % de casos com dados importados do e-SUS (vs. digitados) | Menos retrabalho → mais tempo p/ registro e metas |
| **Tempo de recepção** | Média de minutos por atendimento na recepção | Primeiro termômetro de agilidade; alvo ≤ 2 min |
| **Metas documentadas por PTS** | Nº de metas SMART ativas por PTS | Alimenta diretamente o NSM |
| **Adesão de registro** | % de sessões/atendimentos com registro na plataforma | Se não registram, não há PTS vivo |
| **Tempo até primeira avaliação multiprofissional** | Dias de chegada até 1ª avaliação | Mede fluidez do fluxo interno |

## 4. Health Metrics (guardiões)

| Métrica | Definição | Alerta |
|---|---|---|
| **Pendência de sincronização** | Tempo e % de dados offline não sincronizados | > 24 h em rastreio no piloto |
| **Taxa de divergência manual** | % de classificações do semáforo ajustadas manualmente | > 30% → regras do algoritmo precisam revisão |
| **Erro de integração** | % de chamadas e-SUS com falha | > 10% contínuo → contingência |
| **Satisfação de quem usa** | Feedback qualitativo trimestral (curto) | Sinais de abandono por categoria profissional |
| **Tempo de resposta do sistema** | Percepção de lentidão relatorada | Procura-se latência acima do tolerável na recepção |

## 5. Business Metrics (viabilidade/sustentação)

| Métrica | Definição | Nota |
|---|---|---|
| **Custo de implantação por CER** | Tempo/recursos de instalação, treinamento, integração | Norte para escalabilidade (doc 07 Fase 3) |
| **Tempo de equipe liberado** | Estimativa de horas/equipe recuperadas em registro manual | Base do argumento de valor p/ gestores |
| **Taxa de retenção de CER ativo** | % de CER que segue usando após X meses | Demonstra adesão real pós-piloto |
| **Custo de manutenção mensal** | Esforço contínuo de suporte/evolução | Determina viabilidade sem equipe dedicada |

## 6. Tabela-Quadro de Métricas

| Métrica | Cálculo exato | Fonte do dado | Visualização | Meta | Alerta |
|---|---|---|---|---|---|
| **NSM: % PTS vivos** | (PTS com revisão em dia E ≥1 meta ativa) ÷ PTS ativos total | Banco | Número grande + tendência | ≥ 80% | < 60% por 2 semanas |
| Cobertura de linha de base | Casos c/ dados e-SUS importados ÷ casos novos | Log de integração | Barra | ≥ 90% | < 75% |
| Tempo de recepção | Σ durações de recepção ÷ nº recepções | Log de eventos | Linha/boxplot | ≤ 2 min | > 4 min |
| Metas por PTS | Σ metas ativas ÷ PTS ativos | Banco de metas | Histograma | ≥ 1 | = 0 em casos novos |
| Adesão de registro | Sessões registradas ÷ sessões previstas | Calendário/agenda | Linha | ≥ 70% | < 50% |
| Tempo até 1ª avaliação MP | Dias chegada→1ª avaliação | Linha do tempo PTS | Funnel | ↓ 40% vs. linha de base | sem redução em 8 sem |
| Pendência sincronização | Registros offline n/ sincronizados ÷ total | Fila de sync | Número | ≤ 24 h | > 72 h |
| Taxa de ajuste manual | Classificações manuais ÷ classificações | Auditoria | Barra | ≤ 30% | > 50% |

## 7. Layout do Dashboard

```
┌────────────────────────────────────────────┐
│  NORTH STAR: % PTS vivos — 72% (▲ +6)     │
│  Meta semifinal: ≥ 80%                     │
├──────────────────┬─────────────────────────┤
│ Cobertura base   │ Tempo recepção          │
│ 91% ▲            │ 1m48s ▼                 │
├──────────────────┼─────────────────────────┤
│ Metas por PTS    │ Tempo até 1ª avaliação  │
│ 1,4 ▲            │ 9 dias ▼                │
├──────────────────┴─────────────────────────┤
│ HEALTH: sync pendente 0 · ajuste manual 22%│
│            erros API 4% · satisfação ok    │
├────────────────────────────────────────────┤
│ BUSINESS: custo/CER R$X · horas liberadas  │
│ mensais Y h  · CER ativos 1                │
└────────────────────────────────────────────┘
```

## 8. Cadência de Revisão

| Frequência | O quê | Quem |
|---|---|---|
| **Diária** | Pendência de sincronização, erros de API, fila de reenvio | Operador do piloto |
| **Quinzenal** | Input metrics + NSM; bloqueios de fluxo | Time + sponsor clínico |
| **Mensal** | NSM, business metrics, sintomas de abandono por categoria | Equipe + gestor |
| **Trimestral** | Recalibração de metas, revisão do NSM, avaliação de impacto | Comitê do projeto |

## 9. Pre-Morte: Linha de Base Pré/Pós

Para a avaliação de impacto do piloto (doc 07):

- **Antes da implantação:** medir 2 semanas — tempo de recepção, tempo até 1ª avaliação, nº de avaliações/usuário, forma de registro atual (papel/planilha/prontuário), satisfação da equipe.
- **Após (na N-ésima semana):** medir as mesmas métricas com a plataforma em uso.
- **Comparativo em coorte (cohort-analysis):** uma coorte de usuários completando o fluxo pré vs. pós — tempo de ciclo completo, nº de registros perdidos, metas registradas.

## 10. Plano de Avaliação de Impacto (Resumo)

1. **Linha de base** (2 semanas pré-piloto) registrada em doc próprio.
2. **Momentos de medição:** semana 4, 8 e 12 pós-piloto.
3. **Comparativo por coorte:** usuários pré vs. pós, no mesmo CER, mesmo perfil.
4. **Análise qualitativa:** entrevista com profissional de referência e 1–2 cuidadores sobre a experiência.
5. **Relatório de impacto:** recomendações ao doc 08 (kill-assumptions confirmadas/refutadas) e ao doc 10 (modelo de expansão).

## 11. Decisão de Continuidade

O NSM e os health metrics alimentam o go/no-go da Fase 1→2 e 2→3 (doc 07.8). Sem NSM ≥ 60% e uso real ≥ 70% ao fim do primeiro ciclo de 12 semanas, o plano é estender/corrigir o piloto, não escalar.