# Plano Terapêutico Singular (PTS) Digital - Estrutura e Funcionalidades

## Introdução e Visão Geral

O objetivo deste documento é detalhar a arquitetura e as funcionalidades do software de gestão do Projeto Terapêutico Singular (PTS) em Centros Especializados em Reabilitação (CER). O sistema propõe uma jornada digital completa, estruturada em passos integrados, focada na otimização do tempo, na precisão clínica e na comunicação interdisciplinar, superando os desafios do registro manual e fragmentado.

---

## Passo 1: Recepção Inteligente e Atendimento Integrado

O foco inicial é estabelecer a porta de entrada única da Pessoa com Deficiência (PCD) no CER, validando dados, elegibilidade geográfica e criando vínculo com a Atenção Primária à Saúde (APS) com o mínimo de atrito possível.

### Funcionalidades Chave

#### Integração Territorial via API
- Consulta em tempo real (API FHIR) no e-SUS PEC usando CPF ou CNS para buscar endereço, município e UBS vinculada.

#### Validação de Pactuação (PPI)
- Cruzamento do município do paciente com a tabela de pactuação do CER. Bloqueios e alertas automatizados guiam o encaminhamento correto caso o município não seja pactuado.

#### Linha de Base Clínica Automatizada
- Importação imediata de diagnósticos (CID-10 e CIAP-2), alergias, medicações e histórico do e-SUS PEC, eliminando retrabalho de digitação e reduzindo o tempo de recepção de 15 para 2 minutos.

#### Notificação em Loop Fechado ("Notificar USF")
- Disparo de e-mail/SMS para a equipe de Saúde da Família e injeção de um "Marcador de PTS Ativo" no prontuário do e-SUS PEC local, sinalizando à APS o acompanhamento no CER.

#### Consentimento LGPD Nativo
- Geração de Termo de Consentimento para assinatura digital (via tablet ou WhatsApp/Gov.br).

#### Mapeamento Biopsicossocial do Cuidador
- Coleta de dados sobre o grau de parentesco, idade e comorbidades do cuidador. Aplicação da Escala Rápida de Sobrecarga (Zarit adaptada) para disparar alertas preventivos ao Serviço Social.

### Trade-offs e Soluções (Passo 1)

| Decisão de Design | Pró (Vantagem) | Contra (Desafio Técnico) | Solução Proposta |
|-------------------|----------------|--------------------------|------------------|
| Integração em tempo real via API com e-SUS PEC | Informações 100% atualizadas; sem retrabalho | Risco de inoperância se a internet ou servidor caírem | Modo Assíncrono (Cache Local) para cadastro offline temporário e posterior sincronização |
| Bloqueio geográfico estrito no cadastro | Evita sobrecarga atendendo apenas público pactuado | Atrito com pacientes de endereço recentemente alterado | "Cadastro Provisório com Alerta" (prazo de 15 dias para atualização na UBS) |
| Mapeamento do Cuidador na Entrada | Identifica vulnerabilidades precocemente | Aumenta tempo de recepção; gera filas | Formulário Pré-Chegada via WhatsApp (autoatendimento em casa) |

---

## Passo 2: Triagem Multidimensional e Elegibilidade

Este passo avalia a elegibilidade, classifica a prioridade do caso e direciona adequadamente os recursos, substituindo filas cronológicas por um modelo baseado em necessidades biopsicossociais.

### Funcionalidades Chave

#### Triagem em Três Eixos

- **Clínico**: Validação do motivo do encaminhamento e CID-10.
- **Funcional**: Escala rápida (sliders) para avaliar independência em mobilidade, comunicação, cognição e autocuidado.
- **Social**: Cruzamento com dados do cuidador para avaliar vulnerabilidades estruturais.

#### Algoritmo de Elegibilidade
- Regras de negócio validam se o CID corresponde aos escopos de reabilitação (Física, Intelectual, Visual, Auditiva) do CER, sugerindo aprovação ou reprovação justificada.

#### Semáforo do Cuidado (Motor de Priorização)

- **Vermelho (Alta Prioridade)**: Admissão imediata (fases agudas, janelas críticas). Abertura de vaga prioritária.
- **Amarelo (Média Prioridade)**: Inclusão transparente em fila de espera ativa para casos crônicos sem risco iminente de perda funcional.
- **Verde (Baixa Prioridade)**: Retorno à APS. Condições manejáveis na Atenção Primária.

#### Contrarreferência Inteligente
- Emissão de guia justificada e plano de cuidados (ex: cartilhas de exercícios) para a UBS conduzir pacientes não elegíveis ou de baixa prioridade.

### Trade-offs e Soluções (Passo 2)

| Decisão de Design | Pró (Vantagem) | Contra (Desafio) | Solução Proposta |
|-------------------|----------------|------------------|------------------|
| Algoritmo Automatizado de Priorização | Padronização técnica e justiça, evitando viés | Pode ignorar nuances qualitativas da entrevista | "Ajuste Clínico Manual" com obrigatoriedade de justificativa auditável |
| Integração de Escalas na Triagem | Visão holística que prioriza vulnerabilidades reais | Aumenta tempo de preenchimento pelo triador | Preenchimento Progressivo: pré-carregamento de dados prévios |

---

## Passo 3: Avaliação Médica (Diagnóstico Clínico)

Utilização da metodologia SOAP para traduzir queixas em diagnósticos funcionais e elaborar o plano inicial de encaminhamentos especializados.

### Funcionalidades Chave

#### Prontuário Inteligente SOAP

- **Subjetivo (Necessidades Relatadas)**: Botões de marcação rápida para queixas comuns (ex: "Dificuldade para andar"), agilizando o registro do relato do paciente.
- **Objetivo (Necessidades Percebidas)**: Exame físico com integração de escalas clínicas (Ashworth, Glasgow) e cálculo automatizado de scores.
- **Avaliação (Diagnóstico Funcional)**: Validação do CID/CIAP e registro do potencial de reabilitação.
- **Plano (Prescrição)**: Prescrição de terapias e definição de frequência.

#### Painel de "Divergência Saudável"
- Destaque visual comparando as expectativas do paciente (Subjetivo) com a realidade clínica (Objetivo), orientando o médico no alinhamento de expectativas logo na primeira consulta.

#### Grade de Serviços e Assistente de Distribuição
- Tabela interativa para definir frequências, duração e justificativas clínicas, notificando as agendas das terapias automaticamente.

---

## Passos 4, 5 e 6: Avaliações Multiprofissionais Customizadas

Afastamento dos prontuários genéricos para garantir foco nas especificidades de cada área da reabilitação, promovendo dados mais ricos e estruturados.

### Funcionalidades Chave

#### Abas por Especialidade

- **Fisioterapia**: Foco na CIF (mobilidade, força, fatores ambientais).
- **Terapia Ocupacional (T.O.)**: Avaliação de AVDs, órteses e adaptações.
- **Psicologia**: Aspectos cognitivos, suporte emocional e avaliação do cuidador.

#### Trade-off Solucionado (Usabilidade vs CIF)
- Preenchimento preditivo da CIF. O terapeuta usa checklists visuais amigáveis, e o sistema converte as marcações em códigos CIF em background, evitando exaustão administrativa.

---

## Motor de Cogestão: A Engrenagem da "Inteligência"

Recursos focados em facilitar a comunicação da equipe e garantir que as intervenções formem um plano coeso, e não ações isoladas.

### Funcionalidades Chave

#### Semáforo de Reuniões
- Classificação de complexidade para otimizar o tempo da equipe:
  - Casos graves (Vermelho) exigem reunião presencial
  - Médios (Amarelo) discussão assíncrona
  - Baixos (Verde) aprovação digital padrão

#### Mural Interno (Timeline de Caso)
- Ferramenta tipo "feed de comentários" para comunicação ágil e contextualizada entre terapeutas, reduzindo a necessidade de reuniões constantes para ajustes finos de conduta.

#### Painel de Metas Cruzadas
- Visualização simultânea das metas de todas as especialidades em uma única tela, garantindo alinhamento interdisciplinar.

#### Sincronização de Agendas
- Para gerenciar as reavaliações periódicas, o software sugere ativamente janelas de horários disponíveis em comum entre os múltiplos profissionais envolvidos no acompanhamento.
