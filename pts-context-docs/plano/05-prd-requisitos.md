# 05 — PRD: Plataforma PTS Digital

> **Input:** `01`–`04`, documentos-fonte · **Skills:** `create-prd`, `user-stories`, `wwas`, `test-scenarios`, `prioritize-features`

## 1. Resumo

A **Plataforma PTS Digital** é um sistema de gestão do Projeto Terapêutico Singular para Centros Especializados em Reabilitação (CER) do SUS. Ele conduz o usuário (Pessoa com Deficiência e cuidador) por uma jornada completa — recepção, triagem, avaliação médica, avaliações multiprofissionais, pactuação de metas, acompanhamento e contrarreferência — integrando-se ao e-SUS PEC para eliminar retrabalho e fragmentação de registro. O produto transforma o PTS de documento burocrático em instrumento vivo de cogestão do cuidado.

## 2. Contatos

| Nome | Papel | Comentário |
|---|---|---|
| Time de Produto (estudantes) | Product Owners | Responsáveis pelo roadmap e priorização |
| Ana Rita, Ana Cláudia, Stephanie, Gustavo | Autores dos documentos-fonte | Donos da visão conceitual |
| Médico fisiatra (persona) | Consultor clínico | Valida SOAP e grade de serviços |
| Fisioterapeuta / TO / Psico (personas) | Consultores de domínio | Validam avaliações por especialidade e CIF |
| Gestor de CER (persona) | Sponsor de adoção | Valida indicadores e governança |
| Enfermeiro de CER | Sponsor clínico piloto | Ponte com o cotidiano do serviço |

## 3. Contexto

- **O que é:** gestão digital do PTS em CER, especializada no fluxo de reabilitação.
- **Por que agora:** (a) digitalização do SUS em aceleração (RNDS, e-SUS, Gov.br); (b) lacuna comprovada — nenhum sistema atende o ciclo de vida do PTS em CER (doc 02); (c) a janela antes de prontuários genéricos incorporarem a função é curta (doc 02.5, doc 04.9).
- **O que mudou:** tecnologias de interoperabilidade (FHIR, e-SUS PEC via API) e assinatura digital (Gov.br) tornaram a proposta tecnicamente viável agora — antes, o registro integrado do PTS era inviável em escala.

## 4. Objetivo

Transformar o PTS em instrumento vivo de cogestão nos CER, eliminando retrabalho de registro, fragmentação e comunicação assíncrona.

**Key Results (SMART/OKR):**

| KR | Meta | Medida |
|---|---|---|
| Tempo de recepção | ≤ 2 min | Média por usuário no piloto |
| Linha de base auto-importada | ≥ 90% dos usuários | % de casos com dados e-SUS carregados sem digitação |
| PTS com metas documentadas | ≥ 80% dos PTS ativos | % de PTS com ≥ 1 meta SMART registrada |
| Tempo até primeira avaliação multiprofissional | Redução de ≥ 40% | Comparativo pré/pós piloto |
| Adesão de profissionais | ≥ 70% dos atendimentos registrados na plataforma | % de sessões com registro no sistema |

## 5. Segmentos de Mercado

- **Primário:** equipe multiprofissional de CER (fisiatra, fisioterapeuta, TO, psicólogo, enfermagem, recepção, triador) — problema: registro fragmentado e retrabalho.
- **Secundário:** gestores de CER/secretarias — problema: ausência de indicadores.
- **Induzido:** usuários PCD e cuidadores; APS/USF — problema: invisibilidade do percurso e descontinuidade.
- **Restrição:** ambiente público, infraestrutura heterogênea, conformidade LGPD obrigatória, inclusão digital parcial dos usuários.

## 6. Proposta de Valor

- **Jobs atendidos (JTBD, doc 03.5):** registrar sem redigitar; ver todas as metas numa tela; comunicar de forma assíncrona; dar continuidade à APS; governar com indicadores.
- **Ganhos:** mais tempo de cuidado, plano coeso, fila transparente, evidência para gestão.
- **Dores evitadas:** duplicidade de conduta, perda de histórico, sobrecarga burocrática, desalinhamento de expectativas.
- **Melhor que alternativas:** as alternativas (papel, planilha, prontuário genérico) tratam o PTS como documento; a plataforma o trata como **processo vivo de cogestão** — essa é a única curva de valor relevante (doc 02.5, doc 04.4).

## 7. Solução

### 7.1 Fluxo do Usuário (jornada digital)

```
Recepção ⮕ Triagem ⮕ Avaliação médica ⮕ Avaliações multiprofissionais ⮕ Pactuação de metas ⮕ Ciclo de cuidado ⮕ Reavaliação ⮕ Desfecho
   (Passo 1)   (Passo 2)     (Passo 3)         (Passo 4)                 (Passo 5)          (Passos 5–6)
```

### 7.2 Módulos e Funcionalidades-Chave (MVP e evolução)

#### Módulo 1 — Recepção Inteligente *(MVP)*
- Integração territorial via API FHIR no e-SUS PEC (CPF/CNS → endereço, município, UBS).
- Validação de pactuação PPI com bloqueio/alertas e "Cadastro Provisório com Alerta" (prazo 15 dias).
- Linha de base clínica automatizada (CID-10, CIAP-2, alergias, medicações, histórico) — sem redigitação.
- Notificação em loop fechado: e-mail/SMS à eSF + "Marcador de PTS Ativo" no e-SUS PEC.
- Consentimento LGPD nativo (tablet, link WhatsApp, Gov.br).
- Mapeamento biopsicossocial do cuidador + Escala Rápida de Sobrecarga (Zarit adaptada) → alerta ao Serviço Social.
- **Modo offline/cache local** para contingência de conectividade.

#### Módulo 2 — Triagem Multidimensional *(MVP)*
- Triagem em três eixos: clínico (CID/motivo), funcional (sliders: mobilidade, comunicação, cognição, autocuidado), social (dados do cuidador).
- Algoritmo de elegibilidade por escopo do CER (Física, Intelectual, Visual, Auditiva) com reprovação justificada.
- **Semáforo do Cuidado** (motor de priorização): Vermelho = admissão imediata; Amarelo = fila de espera ativa com tempo estimado; Verde = retorno à APS.
- Ajuste clínico manual com justificativa auditável (obrigatório).
- Contrarreferência inteligente: guia justificada + plano de cuidados para a UBS.

#### Módulo 3 — Diagnóstico e Alinhamento (Prontuário SOAP) *(MVP)*
- Prontuário estruturado SOAP: botões de queixas comuns (S), escalas clínicas com score automático — Ashworth, Glasgow (O), CID/CIAP + diagnóstico funcional e prognóstico (A), grade de serviços com frequência/duração/justificativa (P).
- **Painel de "Divergência Saudável"**: comparativo Relatado (família) × Percebido (clínica) para alinhar expectativas.

#### Módulo 4 — Avaliações Multiprofissionais *(MVP: Fisio + TO; Pós-MVP: demais)*
- Abas por especialidade: Fisioterapia (CIF), Terapia Ocupacional (AVDs, órteses), Psicologia (cognitivo, suporte, cuidador).
- Preenchimento preditivo: checklists visuais → códigos CIF gerados em background.

#### Módulo 5 — Cogestão e Comunicação *(MVP)*
- **Semáforo de Reuniões**: Vermelho = presencial; Amarelo = assíncrona; Verde = aprovação digital.
- **Mural interno** (timeline de caso) — comunicação assíncrona contextualizada.
- **Painel de Metas Cruzadas**: metas de todas as especialidades em uma tela.
- Pactuação de metas SMART com linguagem acessível ao usuário/cuidador.

#### Módulo 6 — Governança e Dashboards *(Pós-MVP)*
- Indicadores de status dos PTS ativos, filas e prioridades em tempo real.
- Sincronização inteligente de agendas para reavaliações.
- Trilha de auditoria do PTS (histórico íntegro das decisões e ajustes).

### 7.3 Requisitos Não-Funcionais (nível produto)

| Área | Requisito |
|---|---|
| **Segurança/Privacidade** | LGPD: consentimento, minimização, registro de tratamento; trilha de auditoria; dados de saúde sensíveis criptografados; controle de acesso por papel |
| **Disponibilidade** | Operação offline/cache com sincronização (contingência de conectividade) |
| **Usabilidade** | Preenchimento progressivo, pré-carregamento, campos preditivos; alvo: registro ≤ 2 min na recepção |
| **Acessibilidade** | Conformidade com LBI (13.146/2015) na interface do usuário/cuidador |
| **Interoperabilidade** | Integração FHIR com e-SUS PEC; capacidade de evoluir para RNDS |
| **Auditabilidade** | Toda modificação manual de priorização/classificação registrada com justificativa |

### 7.4 Assumptions (a validar no doc 08)

A1–A10 do documento 03. Destaques: A5 (acesso à API e-SUS) e A7 (aceitação de consentimento digital) são **bloqueadoras** — testar antes do desenvolvimento full.

### 7.5 Backlog Priorizado (WWA — itens-chave)

**Título:** Linha de base clínica automática via e-SUS (Módulo 1)
**Por quê:** elimina o retrabalho de digitação na recepção, dor nº 1 do fluxo (doc 03), e reduz o tempo de recepção de 15 para 2 min — principal KR do piloto.
**O quê:** ao buscar usuário por CPF/CNS, o sistema consulta o e-SUS PEC e pré-preenche cadastro, diagnóstico e histórico, exibindo em tela revisável antes de salvar. Inclui tratamento offline (cadastro provisório + sincronização).
**Critérios de aceite:**
- Busca por CPF e por CNS retorna dados do e-SUS PEC em ≤ 5 s (conectado).
- Dados importados aparecem destacados como "linha de base", editáveis com flag de alteração.
- Cadastro provisório offline cria o usuário e agenda sincronização automática ao reconectar.
- Falha da API exibe aviso amigável e não trava a recepção (modo offline).
- Auditoria registra origem de cada campo (importado vs. digitado).

**Título:** Semáforo do Cuidado — motor de priorização (Módulo 2)
**Por quê:** substitui fila cronológica injusta por priorização biopsicossocial, distribui recursos com equidade (doc 03.4, doc 02.2) e dá visibilidade ao gestor.
**O quê:** algoritmo de scoring que combina eixos clínico, funcional e social → classificação Verde/Amarelo/Vermelho, com ajuste manual justificado e auditorável.
**Critérios de aceite:**
- Regras de negócio produzem classificação reproduzível para o mesmo conjunto de dados.
- Ajuste manual exige justificativa obrigatória antes de salvar.
- Fila de espera amarela exibe tempo médio estimado para chamada.
- Casos vermelhos abrem vaga prioritária automaticamente na agenda.
- Auditoria registra autor, data e motivo de cada ajuste.

**Título:** Painel de Divergência Saudável (Módulo 3)
**Por quê:** alinha expectativas família × clínica na primeira consulta, reduzindo desgaste e devolutivas desalinhadas (doc 03.3).
**O quê:** painel visual comparando necessidades relatadas (S) com percebidas (O/A), em linguagem clara.
**Critérios de aceite:**
- Contraste visual claro quando relato e avaliação divergem em itens mapeados.
- Painel acessível ao médico em consulta (≤ 1 clique da tela atual).
- Itens de divergência são meros direcionadores — nenhum bloqueio de fluxo.

**Título:** Mural interno + Painel de Metas Cruzadas (Módulo 5)
**Por quê:** reduz reuniões e desalinhamento entre especialidades (doc 03.5), gera plano coeso.
**O quê:** timeline assíncrona de discussão do caso + tela única com metas de todas as especialidades.
**Critérios de aceite:**
- Novo comentário notifica participantes do caso e aparece contextualizado (metas/variáveis associadas).
- Painel lista todas as metas SMART ativas do usuário, com dono e status.
- Semáforo de reunião classifica caso e sugere via de discussão.
- Nenhum campo clínico é alterado por comentário do mural (apenas discussão).

**Título:** Dashboards de governança (Módulo 6)
**Por quê:** dá ao gestor evidência de produção e qualidade (doc 03.5, doc 04.6), garantindo legitimação da ferramenta.
**O quê:** indicadores de PTS ativos, filas, prazos de revisão e tempo de recepção.
**Critérios de aceite:**
- Métricas definidas no doc 09 com fonte de dado inequívoca.
- Dashboard atualiza em tempo real e exporta relatório.
- Acesso por papel (gestor) com trilha de auditoria.

## 8. Release

**Fase 0 — Validação (testes baratos do doc 04.11):** 2–6 semanas. Entrevistas com profissionais de CER, checagem de viabilidade da API e-SUS, protótipo de papel/tela dos módulos 1–2.

**MVP (Fase 1):** Módulos 1, 2, 3, 5 (núcleo do fluxo: recepção → triagem → SOAP → cogestão), módulo 4 com Fisio+TO essencial. Entrega em piloto com 1 CER real. **Não** entra no MVP: módulo completo 6 (só indicadores básicos), avaliações de especialidades extras, expansão de integração RNDS.

**Evolução (Fase 2):** Módulo 6 completo, todas as especialidades do módulo 4, contrarreferência plena à APS integrada, escalonamento para novos CER.

**Pós-piloto:** reavaliação de roadmap com base em indicadores e feedback do piloto (docs 07 e 09).