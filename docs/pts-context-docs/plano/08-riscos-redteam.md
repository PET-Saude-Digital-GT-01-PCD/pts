# 08 — Riscos, Pre-Mortem e Red Team

> **Input:** `03` (assumptions A1–A10), `04` (hipóteses e testes), `07` (go/no-go) · **Skills:** `strategy-red-team`, `pre-mortem`, `prioritize-assumptions`

## 1. Objetivo

Atacar as assumptions que sustentam o plano **enquanto ainda é barato mudar de curso**. Red team honesto: cinco kill-assumptions testáveis valem mais que vinte riscos genéricos.

## 2. Pre-Mortem: Como Este Projeto Fracassa?

*Exercício: o projeto falhou em 12 meses. Narrativas mais prováveis:*

1. **"A API nunca saiu do papel."** A integração com e-SUS PEC exigiu meses de burocracia, o piloto dependeu do sistema e nunca entrou em produção. O projeto morreu de dependência externa.
2. **"Ninguém usou."** Profissionais em sobrecarga acharam o novo fluxo mais demorado que o antigo; o sistema virou "mais uma tela para preencher".
3. **"O CER desistiu."** Sponsor clínico transferido, gestão mudou, a prioridade política sumiu. Sem defensor interno, a adoção morreu.
4. **"Dados vazaram / LGPD deu problema."** Consentimento mal tratado ou falha de segurança destruiu a confiança e inviabilizou o projeto por inteiro.
5. **"O escopo explodiu."** A equipe tentou construir o prontuário perfeito (todos os módulos, todas as integrações) e nunca terminou o núcleo.

## 3. Red Team: Kill-Assumptions Ranqueadas

Ranqueadas por **impacto se errado × probabilidade de erro × custo de teste**. Topo = testar primeiro.

### 🔴 1. "A dor central é o registro fragmentado e o retrabalho no CER."

- **Fails if:** profissionais do CER não percebem o retrabalho/fragmentação como problema prioritário (ex.: já têm fluxo aceitável com prontuário/planilha, ou a dor dominante é outra — falta de pessoal, espaço físico, agenda).
- **Evidence to get this week:** 3–5 entrevistas estruturadas com médico, fisioterapeuta, enfermeiro e recepção de um CER; observar 2 recepções reais cronometrando o fluxo.
- **Kill criterion:** nenhum profissional relata retrabalho/fragmentação como dor top-3 **e** a observação mostra recepção rápida e registros já integrados → plano não tem base.
- **Cheapest test:** 1 dia de campo em um CER + 3 entrevistas. Custo: zero. Prazo: 1 semana.

### 🔴 2. "É possível obter acesso real e estável à API do e-SUS PEC."

- **Fails if:** a secretaria não autoriza, o contrato de API é incompatível, ou o município-piloto não tem e-SUS PEC em operação na maturidade necessária.
- **Evidence to get this week:** conversa formal com a secretaria municipal de saúde (responsável por TI/regulação); resposta escrita sobre procedimento de acesso.
- **Kill criterion:** sem resposta viável em 3 semanas → assumir que integração não acontece no piloto.
- **Cheapest test:** um e-mail/reunião. Custo: tempo. Prazo: 1–2 semanas. **Mitigação se falhar:** pivotar para offline-first — o núcleo de valor (PTS, metas, cogestão) não depende da API; a linha de base pode ser digitada uma vez com flag.

### 🟡 3. "Profissionais adotam o modelo preditivo (checklist CIF, SOAP com botões)."

- **Fails if:** profissionais preferem campo livre/texto corrido e abandonam a estrutura, ou o ganho de tempo não se materializa no uso real.
- **Evidence to get this week:** protótipo de tela (M3/M4) testado com 3 terapeutas; cronometrar registro estruturado vs. livre.
- **Kill criterion:** ≥ 50% dos avaliadores preferem a forma livre e o registro estruturado não reduz tempo em teste de papel.
- **Cheapest test:** protótipo navegável + 3 sessões de 20 min.

### 🟡 4. "O consentimento digital LGPD é aceito por usuários e cuidadores."

- **Fails if:** cuidadores com baixa alfabetização digital recusam assinar em tablet/WhatsApp, ou o jurídico exige fluxo que quebra a recepção.
- **Evidence to get this week:** sessão de observação: assinatura em tablet/link com 5 cuidadores reais.
- **Kill criterion:** ≥ 40% dos cuidadores recusam ou não conseguem concluir sem assistência de ponta a ponta.
- **Cheapest test:** tablet na recepção + 5 participantes.

### 🟡 5. "O CER-piloto tem infraestrutura mínima e vontade institucional de sustentar o piloto."

- **Fails if:** sem conectividade estável, sem dispositivo disponível na recepção, sem sponsor clínico comprometido, ou gestão instável.
- **Evidence to get this week:** visita ao CER; confirmação de sponsor clínico; termo de parceria assinado.
- **Kill criterion:** sem termo e sem sponsor definido em 4 semanas → procurar outro CER ou rebaixar o piloto a ambiente controlado.
- **Cheapest test:** 1 visita + 1 reunião de alinhamento.

## 4. O Que Já Está Bem-Raciocinado

- **Especialização no PTS/CER é defensável:** nenhum concorrente atende o ciclo de vida do PTS; a lacuna é real (docs 02, 04).
- **Foco no núcleo (M1–M5, MVP enxuto) é correto:** concentra esforço na dor central e reduz risco de escopo (contra o pre-mortem 5).
- **Estratégia de complementaridade com e-SUS é acertada:** não disputa o terreno do prontuário público; integra onde precisa.
- **Indicadores desde o piloto:** comparativo pré/pós bem desenhado dá prova de valor que sustenta adoção e financiamento futuro.
- **O trabalho de campo de qualidade reduz o maior risco de todos:** desconexão entre o que o produto presume e o que o cotidiano exige.

## 5. O Que Não Foi Possível Avaliar

- **Jurídico de injeção do "Marcador de PTS" no e-SUS PEC local** — viabilidade normativa depende de consulta específica (A8).
- **Comportamento real de fila e capacidade** — depende de dados do CER-piloto ainda não coletados.
- **Custo real de manutenção pós-piloto** — sem equipe definida, estimativa permanece aberta (A9, doc 10).

## 6. O Que Fazer Agora (prioridade)

| # | Ação | Prazo | Mata/Valida |
|---|---|---|---|
| 1 | 1 dia de campo em CER + 3–5 entrevistas | 1 semana | Kill 1 |
| 2 | E-mail/reunião com secretaria sobre API e-SUS | 1–2 semanas | Kill 2 (caminho crítico) |
| 3 | Visita ao CER e assinatura do termo de parceria | 2 semanas | Kill 5 |
| 4 | Teste de protótipo M3/M4 com 3 terapeutas | 2 semanas | Kill 3 |
| 5 | Sessão de consentimento com 5 cuidadores | 3 semanas | Kill 4 |

Ordem recomendada: **1 → 2 (em paralelo) → 5 → 4 → 3**. Se kill 2 falhar, iniciar pivot offline-first sem parar o restante da validação.

## 7. Ciclo de Revisão

Este documento é **vivo**: re-executado antes de cada go/no-go (doc 07.8). As kill-assumptions que sobreviverem à Fase 0 deixam o topo; novas assumptions emergem do campo e entram na lista.