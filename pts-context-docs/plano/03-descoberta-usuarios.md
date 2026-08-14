# 03 — Descoberta: Usuários, Dores e Jobs to Be Done

> **Input:** `01`, `02` · **Skills:** `user-personas`, `customer-journey-map`, `job-stories`, `market-segments`, `identify-assumptions-new`

## 1. Objetivo

Identificar para quem a plataforma é construída, que jobs ela cumpre e quais dores resolve. Segmentos são definidos por **problemas/jobs**, não por demografia.

## 2. Segmentação por Problema

| Segmento | Problema central | Job principal |
|---|---|---|
| **Gestor de CER** | Sem visão de conjunto do cuidado; falha de indicadores | Governar o cuidado e demonstrar resultado à gestão municipal |
| **Equipe multiprofissional** | Registro fragmentado, metas desalinhadas, retrabalho | Registrar e acompanhar o PTS de forma integrada e ágil |
| **Médico (CER)** | Prontuário genérico, tempo perdido em digitação | Avaliar clinicamente e encaminhar com padronização SOAP |
| **Recepção / Triagem** | Dados repetidos, filas, validação manual de território | Cadastrar e classificar prioridade com rapidez e correção |
| **Usuário PCD e cuidadores** | Sem visibilidade do percurso, sem participação no plano | Saber o que esperar, participar do plano, não se sentir perdido |
| **Equipe de APS (USF)** | Sem comunicação sobre o que o CER faz | Receber contrarreferência e dar continuidade ao cuidado |

**Segmento inicial (beachhead):** a **equipe multiprofissional do CER** — é o gargalo central (registro fragmentado, comunicação assíncrona) e quem primeiro adota a ferramenta no cotidiano. Sem ela, nenhum outro segmento é servido.

## 3. Personas

### 3.1 Dra. Marina — Médica Fisiatra do CER (41 anos)

- **Contexto:** 90% do turno em consultas; registra no prontuário entre pacientes, sob pressão de tempo.
- **Dores:** redigitação de histórico, CID importado errado, dificuldade de explicar diagnóstico funcional à família, desalinhamento entre expectativa da família e prognóstico real.
- **JTBD:** avaliar e diagnosticar de forma padronizada (SOAP) sem gastar tempo extra; encaminhar para especialidades certas com justificativa clínica pronta; alinhar expectativas com a família.
- **Sucesso:** prontuário preenchido em minutos, diagnóstico funcional claro, plano de distribuição de serviços sem retrabalho.

### 3.2 Carlos — Fisioterapeuta, equipe do CER (29 anos)

- **Contexto:** atende 12 usuários/dia; participa de reuniões de equipe semanais; preenche avaliação CIF.
- **Dores:** preencher códigos CIF manualmente (exaustivo), não saber o que a TO ou a Psicologia estão fazendo no mesmo usuário, metas que mudam sem aviso, reuniões longas.
- **JTBD:** registrar avaliação funcional rapidamente; ver as metas de todas as especialidades na mesma tela; ajustar conduta com colegas sem esperar reunião.
- **Sucesso:** avaliação em checklist com CIF gerada em background; painel de metas cruzadas; mural assíncrono para ajustes finos.

### 3.3 Dona Severina — Cuidadora de neto com paralisia cerebral (58 anos)

- **Contexto:** analfabeta funcional, cuida do neto integralmente, chega ao CER por encaminhamento da USF.
- **Dores:** não entende o que vai acontecer, preenche a mesma ficha toda visita, sente-se invisível no processo, sobrecarga física e emocional sem suporte.
- **JTBD:** saber o que esperar da reabilitação; registrar seu contexto sem humilhação; ser ouvida.
- **Sucesso:** formulário pré-chegada no WhatsApp (lê em casa com ajuda), recepção em 2 minutos, identificação precoce de sobrecarga com encaminhamento ao Serviço Social.

### 3.4 Fernanda — Enfermeira da USF (APS) (35 anos)

- **Contexto:** recebe usuários de volta do CER sem saber o que lá foi feito.
- **Dores:** contrarreferência inexistente ou solta, não sabe as metas pactuadas, risco de duplicidade de conduta.
- **JTBD:** saber que o usuário está em PTS no CER e ver as metas; receber plano de cuidados para dar continuidade.
- **Sucesso:** marcador de PTS ativo no prontuário e-SUS; guia de contrarreferência com plano claro.

### 3.5 Paulo — Gestor do CER / Coordenador (45 anos)

- **Contexto:** responde por metas à secretaria municipal; precisa de evidência de produção e qualidade.
- **Dores:** sem indicadores confiáveis do PTS, sem visibilidade de filas e prioridades, reporte manual.
- **JTBD:** monitorar status dos PTS ativos; demonstrar impacto; regular filas de espera.
- **Sucesso:** dashboards em tempo real; relatórios de indicadores prontos.

## 4. Jornada do Usuário (caso de cuidado end-to-end)

Etapas: **Acesso → Recepção → Triagem → Avaliação médica → Avaliações multiprofissionais → Pactuação de metas → Ciclo de cuidado → Reavaliação → Desfecho (alta/contrarreferência)**.

### Toca a Jornada, Touchpoint, Emoção, Dor, Oportunidade

| Etapa | Ação da usuária (Dona Severina e neto) | Touchpoint | Emoção | Dor | Oportunidade do produto |
|---|---|---|---|---|---|
| **Acesso** | Recebe encaminhamento na USF; agenda no CER | USF / telefone | Confusa | Não sabe o que esperar | Formulário pré-chegada via WhatsApp (Passo 1) |
| **Recepção** | Apresenta documentos; família responde ficha | Balcão / tablet | Ansiosa, cansada | Ficha repetida, fila, 15 min | Integração e-SUS PEC → linha de base automática (15→2 min) |
| **Triagem** | Entrevista com enfermeira | Sala de triagem | Esperançosa | Fila cronológica injusta | Semáforo do Cuidado + pré-carregamento de dados |
| **Avaliação médica** | Consulta com fisiatra | Consultório | Frustrada | Expectativa ≠ prognóstico | Painel de Divergência Saudável (SOAP) |
| **Avaliações multiprofissionais** | Fisio, TO, Psico | Salas de terapia | Encorajada | CIF manual, cada um fala sua língua | Abas por especialidade + preenchimento preditivo da CIF |
| **Pactuação de metas** | Família e equipe acordam metas | Reunião | Participativa | Metas nunca explicadas de forma simples | Painel de metas SMART em linguagem acessível |
| **Ciclo de cuidado** | Sessões semanais; ajustes | Terapias | Rotina | Comunicação entre terapeutas falha | Mural interno + painel de metas cruzadas |
| **Reavaliação** | Retornos periódicos | Equipe | Espera longa | Agendas não sincronizam | Sincronização inteligente de agendas |
| **Desfecho** | Alta / volta à USF com plano | APS | Tranquila/incerta | Sem plano para casa; USF sem contexto | Contrarreferência inteligente + marcador e-SUS |

## 5. Job Stories (JTBD)

- **Quando** chega um usuário novo no CER, **quero** ter histórico clínico já carregado **para** não redigitar e não errar diagnósticos (recepção, médica, triador).
- **Quando** a família espera um resultado que a clínica não sustenta, **quero** um painel que evidencie a divergência **para** alinhar expectativas na primeira consulta (médica).
- **Quando** preencho avaliação de reabilitação, **quero** marcar checklists visuais em vez de códigos CIF **para** registrar completo sem exaustão administrativa (terapeutas).
- **Quando** diferentes profissionais cuidam do mesmo usuário, **quero** ver todas as metas numa única tela **para** que as intervenções formem um plano coeso (equipe).
- **Quando** preciso ajustar uma conduta, **quero** conversar de forma assíncrona contextualizada **para** não depender de reunião presencial (equipe).
- **Quando** um usuário não é elegível ou é de baixa prioridade, **quero** emitir guia de contrarreferência com justificativa e plano **para** que a APS conduza sem perda de cuidado (triagem).
- **Quando** gerencio o CER, **quero** visualizar status dos PTS e filas em tempo real **para** regular capacidade e demonstrar resultado (gestor).

## 6. Assumptions a Validar (input para doc 08)

Assumptions identificadas em `identify-assumptions-new`, categorizadas por importância:

### Valor
- **A1.** Registro integrado do PTS reduz fragmentação do cuidado no CER (núcleo da proposta).
- **A2.** Automação de linha de base clínica (e-SUS) reduz tempo de recepção de 15 para 2 min.

### Usabilidade
- **A3.** Profissionais adotam checklist preditivo da CIF (aceitam modelo em vez de prontuário livre).
- **A4.** Mural assíncrono reduz reuniões sem perder qualidade de discussão de caso.

### Viabilidade
- **A5.** Acesso real e estável à API do e-SUS PEC para a integração FHIR.
- **A6.** CER-piloto tem infraestrutura (conectividade, dispositivos, pessoal) mínima para o piloto.

### Legal / Ético
- **A7.** Consentimento LGPD digital (tablet/WhatsApp/Gov.br) é aceito por usuários e cuidadores.
- **A8.** Injeção de marcador no prontuário e-SUS é tecnicamente e juridicamente viável.

### Sustentação
- **A9.** Há alguém responsável pela manutenção e evolução do sistema pós-piloto.
- **A10.** Cultura do serviço aceita prescrição de priorização algorítmica (semáforo) com ajuste manual.

## 7. Síntese para Estratégia e PRD

- Primeiro segmento: **equipe multiprofissional do CER** (adota a ferramenta e destrava todos os demais).
- Dores que sustentam o produto: **retrabalho de registro, comunicação assíncrona, desalinhamento de metas, sobrecarga burocrática** — todas endereçadas pelos 6 módulos.
- Assumptions A1–A10 alimentam o plano de riscos (doc 08) e os testes de validação inicial.