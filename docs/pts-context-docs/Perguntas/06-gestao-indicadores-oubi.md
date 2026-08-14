# Pergunta 6 — Gestão e Indicadores (BI)

## Indicadores que a coordenação/gestão gostaria de visualizar sobre os PTS

---

## 1. Objetivo

Definir o painel de indicadores (BI) para coordenadores e gestores: como saber se o CER está entregando cuidado de qualidade, sob controle de filas e com evidência para prestar contas à gestão municipal/estadual. Cada indicador tem fórmula, fonte de dado, meta e alerta.

---

## 2. Método

Bons indicadores são: **compreensíveis, comparáveis ao longo do tempo, medidos como razão/taxa, e mudam comportamento** (não são ilustração). Hierarquia adotada: **North Star** (o que mais importa) → **indicadores de entrada** (impulsionadores) → **saúde** (guardiães) → **gestão** (eficiência e conformidade).

---

## 3. O Indicador Principal (North Star)

### "% de PTS ativos com revisão em dia e com ≥ 1 meta SMART documentada"

> Mede o **PTS vivo**: plano pactuado (tem meta) e atualizado (revisado no prazo). É o coração do que o produto promete — cuidado contínuo, não papel burocrático.

**Cálculo:** `(PTS ativos com revisão em dia E ≥ 1 meta ativa) ÷ PTS ativos total × 100`
**Meta:** ≥ 80% · **Alerta:** < 60% por 2 semanas.

---

## 4. Painel de Indicadores

### 4.1 Indicadores de ENTRADA (impulsionam o North Star)

| # | Indicador | Fórmula | Fonte | Meta | Alerta |
|---|---|---|---|---|---|
| E1 | **Cobertura de linha de base automática** | Casos com dados importados do e-SUS ÷ casos novos × 100 | Log de integração | ≥ 90% | < 75% |
| E2 | **Tempo médio de recepção** | Σ duração de recepção ÷ nº recepções (min) | Log de eventos | ≤ 2 min | > 4 min |
| E3 | **Metas documentadas por PTS** | Σ metas ativas ÷ PTS ativos | Banco de metas | ≥ 1,0 | 0 em casos novos |
| E4 | **Adesão de registro** | Sessões registradas ÷ sessões previstas × 100 | Agenda/calendário | ≥ 70% | < 50% |
| E5 | **Tempo até 1ª avaliação multiprofissional** | Dias da chegada à 1ª avaliação (mediana) | Linha do tempo do PTS | ↓ ≥ 40% vs. linha de base | sem redução em 8 sem |

### 4.2 Indicadores de SAÚDE (guardiões da qualidade)

| # | Indicador | Fórmula | Meta | Alerta |
|---|---|---|---|---|
| S1 | **Pendência de sincronização** | Registros offline não sincronizados ÷ total (tempo) | ≤ 24 h | > 72 h |
| S2 | **Taxa de ajuste manual do semáforo** | Classificações ajustadas ÷ classificações × 100 | ≤ 30% | > 50% |
| S3 | **Erro de integração (API e-SUS)** | Chamadas com falha ÷ chamadas × 100 | ≤ 5% | > 10% contínuo |
| S4 | **Satisfação da equipe com o sistema** | Feedback qualitativo trimestral | Tendência positiva | Sinais de abandono por categoria |
| S5 | **Cobertura de consentimento LGPD** | PTS com consentimento registrado ÷ PTS ativos × 100 | 100% | < 95% |

### 4.3 Indicadores de GESTÃO (eficiência, filas e conformidade)

| # | Indicador | Fórmula | Fonte |
|---|---|---|---|
| G1 | **Fila de espera ativa (amarela)** | Nº de usuários aguardando + tempo médio de espera estimado | Módulo triagem |
| G2 | **Casos de alta prioridade atendidos em X dias** | Vermelhos admitidos em ≤ 7 dias ÷ vermelhos × 100 | Módulo triagem |
| G3 | **Tempo médio do ciclo do PTS** | Dias da abertura ao encerramento/alta (mediana) | Linha do tempo |
| G4 | **Taxa de desfechos** | Alta por metas, contrarreferência, descontinuação ÷ PTS encerrados × 100 | Módulo término |
| G5 | **Contrarreferências entregues à APS** | PTS fechados por contrarreferência com guia enviada ÷ PTS fechados × 100 | Loop fechado |
| G6 | **Produção por especialidade** | Nº de atendimentos registrados por disciplina/mês | Módulo acompanhamento |
| G7 | **Faltas e abandono** | Eventos de falta ÷ eventos previstos; taxa de descontinuação por falta | Módulo acompanhamento |
| G8 | **Reavaliações em dia** | Reavaliações realizadas no prazo ÷ reavaliações previstas × 100 | Módulo reavaliação |
| G9 | **Trilha de auditoria íntegra** | Quantidade de auditorias consultadas; desvio → investigação | Registro de auditoria |

### 4.4 Indicadores de IMPACTO (para prestação de contas à gestão)

| # | Indicador | Fórmula | Uso |
|---|---|---|---|
| I1 | **Horas de equipe liberadas** | Estimativa de tempo economizado em registro manual (base E2 e volume) | Argumento de valor/eficiência |
| I2 | **Evolução funcional dos usuários** | Delta de escores funcionais entre avaliação inicial e reavaliação (coorte) | Evidência de melhora |
| I3 | **Satisfação de usuários/cuidadores** | Pesquisa curta ao fim do percurso | Qualidade percebida |
| I4 | **Custo de implantação/suporte por CER** | Recursos investidos ÷ CER ativo | Escalabilidade |

---

## 5. Layout do Dashboard de Gestão

```
┌────────────────────────────────────────────┐
│  NORTH STAR: % PTS vivos — 72% (▲ +6)     │
│        meta semifinal: ≥ 80%              │
├──────────────────┬─────────────────────────┤
│ E1 linha de base │ E2 tempo recepção       │
│ 91% ▲            │ 1m48s ▼                 │
├──────────────────┼─────────────────────────┤
│ E3 metas por PTS │ E5 até 1ª avaliação     │
│ 1,4 ▲            │ 9 dias ▼                │
├──────────────────┴─────────────────────────┤
│ FILAS: amarela 34 casos · espera 18 dias   │
│ vermelho atendido ≤7d: 95%                 │
├────────────────────────────────────────────┤
│ SAÚDE: sync 0h · ajuste manual 22%         │
│ erros API 4% · consentimento 99% ·         │
│ satisfação equipe: estável                 │
├────────────────────────────────────────────┤
│ IMPACTO: horas liberadas 320h/mês ·        │
│ delta funcional coorte: +18% ·             │
│ custo/CER R$ X                             │
└────────────────────────────────────────────┘
```

---

## 6. Cadência de Revisão

| Frequência | O quê revisar | Quem |
|---|---|---|
| **Diária** | Fila, pendência de sync, erros de API, faltas críticas | Operador/coordenação de turno |
| **Quinzenal** | Indicadores de entrada (E1–E5) + North Star; bloqueios de fluxo | Time + sponsor clínico |
| **Mensal** | North Star, saúde (S1–S5), desfechos (G4/G5), produção (G6) | Gestor + equipe |
| **Trimestral** | Impacto (I1–I4), recalibração de metas, ajuste de alertas | Comitê de gestão |

---

## 7. Perguntas Que o Gestor Quer Responder (e qual indicador responde)

| Pergunta do gestor | Indicador |
|---|---|
| Quantos PTS estão ativos e vivos? | North Star |
| A fila está justa e transparente? | G1, G2 |
| A equipe está registrando o cuidado de verdade? | E4, G6 |
| Os casos graves entram rápido? | G2 |
| O usuário melhora? | I2 (delta funcional em coorte) |
| Estamos devolvendo o cuidado à APS com plano? | G5 |
| Estamos gastando minha equipe em burocracia? | E2, I1 |
| O sistema está saudável e seguro? | S1, S3, S5, G9 |
| Dá para provar valor à secretaria? | I1–I4 |

---

## 8. Da Médida à Decisão (mudança de comportamento)

Cada indicador existe para **gerar uma ação**, não apenas um número:

| Se... | Então... |
|---|---|
| North Star < 60% | Revisar fluxo de reavaliação e pactuação; capacitar equipe |
| E5 (1ª avaliação) estagnado | Investigar gargalo entre SOAP e avaliações; ajustar agendas |
| S2 (ajuste manual) > 50% | Recalibrar regras do semáforo com a equipe clínica |
| G1 (fila) cresce | Discutir capacidade × demanda; acionar região (consórcio) |
| G7 (faltas/abandono) alto | Acionar profissional de referência e Serviço Social (sobrecarga do cuidador) |
| I2 (delta funcional) negativo | Revisar qualidade das intervenções e metas pactuadas |

---

## 9. Comparativo Pré/Pós (avaliação de impacto do piloto)

- **Coleta pré-implantacão (2 semanas):** tempo de recepção, tempo até 1ª avaliação, nº de avaliações/usuário, formato de registro, satisfação da equipe.
- **Pós (semanas 4, 8, 12):** mesmas métricas no sistema.
- **Comparação em coorte:** usuários que completaram o fluxo pré vs. pós — tempo de ciclo, registros perdidos, metas documentadas.
- **Saída:** relatório de impacto → decision point de continuidade/escalonamento (documento de roadmap).

Fonte: plano/09 (governança de métricas) e plano/04 (north star e OMTM).