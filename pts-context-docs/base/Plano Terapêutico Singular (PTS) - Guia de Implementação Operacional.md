# Plano Terapêutico Singular (PTS) - Guia de Implementação Operacional

## 1. Sumário Executivo e Visão Geral

A proposta apresenta uma visão arquitetônica para o desenvolvimento de uma aplicação digital focada na gestão do Projeto Terapêutico Singular (PTS), visando superar gargalos operacionais no SUS, especialmente nos Centros Especializados em Reabilitação (CER). A plataforma transforma registros fragmentados em um ecossistema inteligente e centrado na pessoa.

### Visão Geral e Estrutura dos Módulos

A arquitetura está dividida em seis módulos operacionais que acompanham a jornada do paciente, integrando tecnologia para liberar a equipe para o cuidado direto:

- **Módulo 1: Recepção Inteligente**: Validação territorial via API FHIR com e-SUS PEC, mapeamento de vulnerabilidade do cuidador e conformidade nativa com a LGPD.
- **Módulo 2: Triagem Multidimensional**: Substituição de filas cronológicas por um motor de priorização (Semáforo do Cuidado) e contrarreferência inteligente para a Atenção Primária.
- **Módulo 3: Diagnóstico e Alinhamento**: Prontuário SOAP estruturado com Painel de Divergência Saudável para alinhar expectativas entre família e equipe médica.
- **Módulo 4: Avaliações Multiprofissionais**: Abas customizadas por especialidade e preenchimento preditivo da CIF para reduzir carga burocrática.
- **Módulo 5: Cogestão e Comunicação**: Gestão de metas SMART, mural de discussão assíncrona e classificação de prioridade para reuniões de equipe.
- **Módulo 6: Governança e Dashboards**: Indicadores de evolução clínica, interoperabilidade com normas ISO e sincronização inteligente de agendas.

---

## Passo 1: Recepção e Atendimento

**Objetivo**: Estabelecer a porta de entrada única da Pessoa com Deficiência (PCD) no Centro Especializado em Reabilitação (CER). Este passo garante a consistência dos dados históricos do paciente, valida a elegibilidade geográfica e estabelece o vínculo de comunicação imediata com a Atenção Primária à Saúde (APS).

### Como funciona no software:

#### Validação Territorial via API

- No SUS, o conceito de "só município" ou "território" é complexo. Os CERs costumam ser de abrangência regional (atendendo consórcios de municípios).
- **A Solução**: Ao digitar o CPF ou CNS, o sistema faz uma consulta em tempo real (via API FHIR) no e-SUS PEC do cidadão para extrair os dados territoriais cadastrados (Endereço, Bairro, Município, Microárea e CNES da Unidade Básica de Saúde vinculada).

#### Regra de Negócio - Pactuação Programada Pactuada (PPI)

O sistema cruza o município de residência retornado com uma Tabela de Pactuação Programada Pactuada (PPI) pré-configurada no sistema:

- **Se o município for pactuado**: O cadastro prossegue normalmente.
- **Se o município não for pactuado**: O sistema dispara um alerta visual impeditivo de "Município Sem Pactuação Ativa com este CER", oferecendo uma tela de justificativa para casos excepcionais (ex: decisão judicial) ou gerando uma guia de orientação/redirecionamento para o CER de direito daquele cidadão.

#### Linha de Base Clínica Automatizada (Sem Redigitação)

Para evitar que o recepcionista ou o triador precise redigitar todo o histórico do paciente, o sistema realiza uma varredura de dados prévios do e-SUS PEC.

- **A Solução**: O software consome e exibe imediatamente em tela:
  - Diagnósticos ativos e condições crônicas (CID-10 e CIAP-2)
  - Deficiências já registradas no cadastro individual da APS
  - Histórico de internações, medicamentos ativos e alergias
- **Resultado**: Redução do tempo de recepção de 15 minutos para menos de 2 minutos, além de evitar erros humanos de transcrição de diagnósticos complexos.

#### Gatilho de Notificação (O "Notificar USF")

Notificações passivas (como o envio de e-mails automáticos) costumam ser ignoradas na rotina corrida dos postos de saúde.

- **A Solução**: O sistema utilizará um mecanismo de **Notificação em Loop Fechado**. Assim que o número do PTS é gerado no CER, o software realiza duas ações em paralelo:
  1. Envia uma notificação direta via e-mail/SMS para o e-mail cadastrado da equipe de Saúde da Família (eSF) de origem.
  2. **Diferencial Tecnológico**: Injeta um "Marcador de PTS Ativo" diretamente no prontuário do paciente dentro do e-SUS PEC local. Quando o médico ou enfermeiro da USF abrir a ficha desse paciente para uma consulta de rotina na atenção primária, um painel em destaque avisará: "Cidadão em acompanhamento de PTS no CER: [Nome do CER]", permitindo que a APS visualize de forma síncrona as metas que o CER estabeleceu para aquele paciente.

#### Consentimento LGPD Nativo e Protocolo Eletrônico

- **A Solução**: Por lidar com dados de saúde altamente sensíveis (PCD, vulnerabilidades sociais e familiares), o sistema gera um Termo de Consentimento e Tratamento de Dados (LGPD) em tela.
- O familiar/responsável pode assinar digitalmente através de um tablet de mesa integrado à recepção ou por meio de um link enviado via WhatsApp na hora (integrado à plataforma do Gov.br).

#### Mapeamento Biopsicossocial do Cuidador e Rede de Apoio

Para pacientes PCD, o cuidado é centrado na família. Registrar apenas o nome e o telefone do responsável é insuficiente para o desenvolvimento de um PTS eficaz.

- **A Solução**: O cadastro inicial exige o preenchimento do Módulo de Vulnerabilidade do Cuidador, que coleta:
  - Grau de parentesco e papel na rotina do paciente
  - Idade do cuidador (identificando cuidadores idosos ou muito jovens)
  - Se o próprio cuidador possui alguma deficiência ou comorbidade limitante
  - Escala Rápida de Sobrecarga (Zarit Burden Interview adaptada): Três perguntas de resposta rápida para classificar preventivamente o nível de estresse daquele núcleo familiar, disparando um alerta automático para a equipe de Serviço Social do CER no Passo 2.

### Trade-offs do Passo 1

| Decisão de Design | Pró (Vantagem) | Contra (Desafio Técnico) | Solução Proposta |
|-------------------|----------------|--------------------------|------------------|
| Integração em tempo real via API com e-SUS PEC | Informações cadastrais e clínicas 100% atualizadas; sem retrabalho de digitação | Se a internet do CER cair ou o servidor central do e-SUS do município estiver offline, a recepção trava | Modo de Operação Assíncrono (Cache Local): O software permite cadastrar de forma offline/manual provisória e faz a sincronização de dados assim que a conexão for restabelecida |
| Bloqueio geográfico estrito no cadastro | Garante que o CER atenda exclusivamente o público pactuado, evitando sobrecarga | Pode causar atrito ou atraso no acolhimento de pacientes que mudaram de endereço recentemente e ainda não atualizaram o cadastro na USF de origem | Função "Cadastro Provisório com Alerta". Permite a entrada do paciente, mas gera uma pendência administrativa (prazo de 15 dias) para que a família atualize o cadastro no posto de saúde |
| Exigência do Mapeamento do Cuidador na Entrada | Identifica vulnerabilidades familiares cruciais logo no primeiro contato | Pode aumentar o tempo de atendimento da recepção, gerando filas físicas no CER | Formulário Pré-Chegada: O sistema envia um link de autoatendimento via WhatsApp assim que o paciente é agendado para o CER, permitindo que a família preencha os dados do cuidador de forma calma em casa |

---

## Passo 2: Triagem e Elegibilidade

**Objetivo**: Avaliar a elegibilidade do paciente para o Centro Especializado em Reabilitação (CER), classificar a prioridade clínica e social do caso de forma justa e evitar o represamento de filas, direcionando adequadamente quem realmente necessita de atenção especializada. A triagem é realizada por uma equipe multiprofissional (Enfermeiro, Assistente Social ou Profissional Regulador).

### Como funciona no software:

#### Triagem Multidimensional Integrada (Além da Ficha Básica)

O software não pode apenas fazer perguntas "sim ou não". Ele deve guiar o triador por uma avaliação rápida, dividida em três eixos principais que se autoalimentam de dados:

- **Eixo Clínico**: O sistema apresenta em tela o CID-10 principal importado do e-SUS PEC e solicita o preenchimento do motivo exato do encaminhamento.
- **Eixo Funcional**: Uma mini-escala rápida com botões deslizantes (sliders) para avaliar o grau de independência do paciente em quatro domínios da vida diária: Mobilidade, Comunicação, Cognição e Autocuidado.
- **Eixo Social**: Cruzando as informações do Módulo do Cuidador do Passo 1, o sistema avalia a composição familiar e o grau de vulnerabilidade social (ex: pobreza extrema, isolamento geográfico).

#### Algoritmo de Elegibilidade e Validação de Escopo

O CER atende a modalidades específicas de reabilitação (Física, Intelectual, Visual e Auditiva). O sistema aplica regras lógicas para evitar admissões inadequadas:

- **Regra de Negócio**: Se o CID ou a queixa principal não corresponderem a uma deficiência elegível estabelecida na portaria do CER, o sistema sugere imediatamente a reprovação com base nas diretrizes do Ministério da Saúde.

#### Motor de Classificação de Risco e Prioridade (O Semáforo do Cuidado)

Em vez de uma fila comum por ordem de chegada, o sistema roda um algoritmo de pontuação (scoring) para categorizar o paciente em um semáforo de prioridades:

- **Alta Prioridade (Admissão Imediata)**: Pacientes em fases agudas ou pós-cirúrgicas recentes com janela de reabilitação crítica (ex: pós-AVC recente, Traumatismo Cranioencefálico recente, ou crianças na primeira infância com atraso severo no neurodesenvolvimento). O sistema abre automaticamente uma vaga prioritária na agenda médica e multiprofissional.

- **Média Prioridade (Inclusão em Agenda Terapêutica)**: Casos crônicos com bom prognóstico de ganho funcional, mas sem risco de perda iminente de função. O sistema posiciona o paciente na fila de espera ativa de forma transparente, estimando o tempo médio para o chamado.

- **Baixa Prioridade (Retorno à APS)**: Pacientes com dores crônicas leves, lesões ortopédicas simples ou condições que podem ser manejadas com segurança pela própria equipe de Atenção Primária na USF de origem.

#### Emissão de Guia de Apoio Clínico para a APS (A Contrarreferência Justificada)

Quando o desfecho da triagem indica "Baixa Prioridade / Retorno à APS", o sistema não pode simplesmente fechar a tela.

- **A Solução**: O software gera uma **Guia de Contrarreferência Inteligente**. Esse documento, enviado diretamente para o e-SUS PEC da equipe de saúde da família do paciente, contém:
  - A justificativa clínica de não elegibilidade para o CER
  - Um plano de cuidados sugerido (ex: cartilhas de exercícios para dor lombar crônica, orientações de autocuidado) para que a equipe da USF possa conduzir o paciente na própria comunidade

### Trade-offs do Passo 2

| Decisão de Design | Pró (Vantagem) | Contra (Desafio) | Solução de Contorno do Sistema |
|-------------------|----------------|------------------|-------------------------------|
| Algoritmo Automatizado de Priorização (Scoring) | Garante um processo justo, técnico e padronizado, evitando favorecimentos ou critérios subjetivos | Pode parecer frio e ignorar nuances sutis da vida do paciente que apenas a conversa presencial revela | Função "Ajuste Clínico Manual": O triador pode alterar manualmente a classificação gerada pelo algoritmo, desde que escreva uma justificativa detalhada que ficará registrada na auditoria do PTS |
| Integração de Escalas Sociais e Clínicas na Triagem | Permite uma visão holística (biopsicossocial), garantindo que pacientes socialmente vulneráveis tenham prioridade | Torna a triagem mais demorada para o profissional que está preenchendo os dados | Preenchimento Progressivo: O sistema pré-carrega todas as informações cadastrais e do e-SUS PEC para que o triador precise apenas dar cliques rápidos nos parâmetros de funcionalidade |

---

## Passo 3: Avaliação Médica (O Diagnóstico Clínico)

**Objetivo**: Realizar a avaliação clínica inicial do paciente no Centro Especializado em Reabilitação (CER) utilizando a metodologia SOAP (Subjetivo, Objetivo, Avaliação e Plano). Este passo traduz a queixa clínica em um diagnóstico funcional preliminar, definindo a necessidade de reabilitação e gerando o encaminhamento para as especialidades adequadas.

### Como funciona no software:

#### Prontuário Inteligente Baseado na Metodologia SOAP

A tela médica é estruturada estritamente sob a lógica SOAP para garantir a padronização e a facilidade de preenchimento pelo profissional de medicina:

**S - Subjetivo (As "Necessidades Relatadas")**:
- Espaço dedicado para registrar o relato do paciente e de seus familiares/cuidadores sobre as queixas principais, expectativas de melhora e limitações diárias percebidas por eles.
- **Diferencial do Software**: O sistema disponibiliza botões de marcação rápida para as queixas mais comuns em reabilitação (ex: "Dificuldade para andar", "Dificuldade de comunicação", "Dor intensa"). Ao clicar, o sistema preenche o texto automaticamente, permitindo que o médico adicione observações personalizadas.

**O - Objetivo (As "Necessidades Percebidas" e Escalas Clínicas)**:
- Campo para registro do exame físico médico tradicional.
- **Diferencial do Software**: Integração de Escalas Clínicas Rápidas nativas de acordo com a suspeita diagnóstica (ex: Escala de Ashworth Modificada para espasticidade, ou Escala de Coma de Glasgow se aplicável). O médico preenche os parâmetros na tela e o sistema calcula o score automaticamente, salvando-o na linha do tempo do paciente.

**A - Avaliação (O Diagnóstico Clínico e Funcional)**:
- O sistema exibe o CID-10 e/ou o CIAP-2 já importados do e-SUS PEC, permitindo ao médico confirmar, refinar ou adicionar novos diagnósticos ativos na ficha do paciente.
- Além do diagnóstico nosológico (a doença em si, como o TCE), o médico preenche o Diagnóstico Funcional e Prognóstico, descrevendo o potencial de reabilitação do paciente.

**P - Plano (Prescrição e Encaminhamento de Serviços)**:
- A partir da avaliação, o médico prescreve as especialidades necessárias e a frequência estimada para cada uma (ex: Fisioterapia 3x por semana, Terapia Ocupacional 2x por semana).

#### O Painel de "Divergência Saudável" (Relatado vs. Percebido)

Para que o PTS seja centrado no paciente, o sistema gera um painel comparativo visual entre as **Necessidades Relatadas** (expectativa do paciente/família) e as **Necessidades Percebidas** (achados clínicos do médico).

**Exemplo prático**: Se a família relata como prioridade máxima "voltar a andar sozinho" (Subjetivo), mas a avaliação clínica médica percebe que o paciente ainda não possui controle de tronco básico (Objetivo), o sistema destaca esse desalinhamento em tela. Isso orienta o médico a conduzir uma conversa de alinhamento de expectativas com a família logo na primeira consulta.

#### Assistente de Distribuição de Cuidado (Grade de Serviços)

Após salvar o plano, as agendas desses profissionais no CER são notificadas de que há um novo paciente aguardando suas avaliações específicas. Ao definir o plano (P), o médico preenche uma tabela interativa com os serviços recomendados:

| Serviço Solicitado | Frequência Recomendada | Tempo Estimado de Ciclo | Justificativa Clínica |
|-------------------|----------------------|------------------------|----------------------|
| Fisioterapia | 3x por semana | 12 semanas | Treino de controle de tronco e fortalecimento muscular |
| Terapia Ocupacional | 2x por semana | 12 semanas | Adaptação para Atividades de Vida Diária (alimentação/higiene) |
| Psicologia | 1x por semana | 24 semanas | Suporte emocional familiar e aceitação do quadro pós-trauma |

---

## Passo 4: Avaliações Multiprofissionais

**Objetivo**: Garantir a interdisciplinaridade no cuidado, com avaliações específicas por categoria profissional integradas ao PTS.

### Como funciona no software:

- **Abas Customizadas**: Interfaces específicas para Fisioterapia (CIF), T.O. (AVDs) e Psicologia.
- **Preenchimento Preditivo**: Checklists que geram códigos da CIF automaticamente em segundo plano.

---

## Passo 5: Cogestão e Comunicação

**Objetivo**: Facilitar a pactuação de metas com o paciente e a comunicação entre a equipe multiprofissional.

- **Metas SMART**: Painel visual para monitoramento de objetivos específicos e prazos definidos.
- **Mural de Discussão**: Timeline assíncrona para troca de informações rápidas sobre o caso.

---

## Passo 6: Governança e Dashboards

**Objetivo**: Monitorar a evolução clínica e assegurar a conformidade administrativa do CER.

- **Indicadores Clínicos**: Dashboards em tempo real sobre o status dos PTS ativos.
- **Gestão de Agendas**: Sincronização inteligente para marcação de reavaliações periódicas.

### Inteligência do Sistema

A inteligência do sistema permite otimizar o tempo da equipe através de categorizações automáticas e ferramentas de apoio à decisão:

- **Categorização de Prioridade de Reunião**: Classificação em semáforo (Verde, Amarelo, Vermelho) para definir a necessidade de discussões presenciais ou assíncronas.
- **Painel de Metas Cruzadas**: Visão integrada dos objetivos de todas as especialidades em uma única tela.
- **Trade-offs de Usabilidade**: Uso de campos preditivos para equilibrar a completude de dados (CIF) com a agilidade no atendimento.
