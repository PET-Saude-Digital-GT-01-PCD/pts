# Pergunta 4 — Legislação e Referências: Requisitos Não Funcionais

## Normas relacionadas ao PTS convertidas em requisitos do sistema

---

> **Aviso de precisão:** as normas listadas abaixo estão identificadas e convertidas em requisitos. A **citação literal** de textos legais (teor exato de artigos e portarias) ainda requer verificação em fonte primária antes de publicação acadêmica formal. Recomenda-se conferir: Portaria GM/MS nº 793/2012, Resolução CFM nº 1.821/2007, Lei nº 13.709/2018 (LGPD), Lei nº 13.146/2015 (LBI) e Resolução CNS nº 510/2016.

---

## 1. Princípio

Requisitos **não funcionais** traduzem leis, portarias e normas técnicas em **restrições de comportamento do sistema** (segurança, disponibilidade, usabilidade, interoperabilidade, auditoria). Cada norma abaixo é seguida pelos requisitos que ela gera.

---

## 2. Marco Normativo e Requisitos Gerados

### 2.1 Constituição Federal de 1988 (arts. 196–200) — Direito à Saúde e SUS

**Referência:** saúde como direito de todos e dever do Estado; organização do SUS (integralidade, universalidade, equidade); atuação na reabilitação.

| Requisito | Descrição |
|---|---|
| RNF-1.1 | O sistema deve operar **sem custo de acesso ao usuário** (cidadão), alinhado à universalidade do SUS |
| RNF-1.2 | A solução deve preservar a **integralidade do cuidado** (não fragmentar): um único PTS agregando todas as especialidades |
| RNF-1.3 | O sistema deve apoiar a **equidade**: priorização por necessidade (semáforo), não por ordem de chegada |

### 2.2 Política Nacional de Humanização — PNH (2003) e Clínica Ampliada

**Referência:** origem institucional do PTS; centralidade do sujeito; cogestão; vínculo.

| Requisito | Descrição |
|---|---|
| RNF-2.1 | O fluxo deve **garantir o protagonismo do usuário**: metas apresentadas em linguagem acessível e pactuadas (cogestão), nunca apenas prescritas |
| RNF-2.2 | O sistema deve materializar a **equipe de referência**: identificação obrigatória do profissional de referência em todo PTS |
| RNF-2.3 | As discussões de caso (reuniões/mural) devem ser parte do fluxo, não anexos — registro de discussão vinculado ao PTS |

### 2.3 Portaria GM/MS nº 793/2012 — Rede de Cuidados à Pessoa com Deficiência e CER

**Referência:** criação dos CER; escopos de reabilitação (física, intelectual, visual, auditiva); o PTS como principal instrumento de gestão do cuidado.

| Requisito | Descrição |
|---|---|
| RNF-3.1 | O sistema deve validar **elegibilidade por escopo do CER** (regras de negócio por modalidade de reabilitação), reprovando com justificativa (RF-2.2 da Pergunta 1) |
| RNF-3.2 | O PTS deve ser o **agregador central** de todo registro clínico do usuário no CER |
| RNF-3.3 | Acompanhamento **longitudinal**: o sistema deve suportar reavaliações periódicas e versionamento do PTS |

### 2.4 Lei nº 13.709/2018 — LGPD (Lei Geral de Proteção de Dados)

**Referência:** dados de saúde são **dados pessoais sensíveis** (art. 5º, II e XI); tratamento exige base legal, consentimento quando aplicável, minimização, segurança e comunicação de incidentes.

| Requisito | Descrição |
|---|---|
| RNF-4.1 | **Consentimento:** registro digital do consentimento para tratamento de dados de saúde, revogável, com trilha (data, canal, versão do termo) |
| RNF-4.2 | **Minimização:** coleta seletiva por etapa — apenas dados necessários à função; linha de base importada de forma seletiva |
| RNF-4.3 | **Segurança:** dados sensíveis criptografados em trânsito e em repouso; controle de acesso por papel (Pergunta 3) |
| RNF-4.4 | **Registro de tratamento:** trilha de auditoria de todas as operações sobre dados de saúde |
| RNF-4.5 | **Incidente de segurança:** procedimento de notificação e registro de vazamento conforme art. 48 |
| RNF-4.6 | **Retenção e direito ao esquecimento:** prazos de retenção definidos; mecanismo de eliminação quando legalmente aplicável |
| RNF-4.7 | **Acesso e correção:** portal do usuário permitindo conhecer e solicitar correção dos próprios dados |

### 2.5 Lei nº 13.146/2015 — LBI (Lei Brasileira de Inclusão)

**Referência:** acessibilidade e inclusão da PCD como direitos; barreiras atitudinais e tecnológicas.

| Requisito | Descrição |
|---|---|
| RNF-5.1 | **Acessibilidade web:** interface do usuário/cuidador conforme padrões de acessibilidade (WCAG) — leitura de tela, contraste, navegação por teclado |
| RNF-5.2 | **Linguagem simples:** conteúdo do portal em linguagem acessível a baixa escolaridade; opção de apoio (áudio/leitura) |
| RNF-5.3 | O sistema não pode **exigir dispositivo ou alfabetização digital** do usuário: jornada mediada pelo serviço quando necessário (formulário pré-chegada via WhatsApp, assistência da recepção) |
| RNF-5.4 | Suporte a **cuidadores idosos/muito jovens**: fluxos curtos e assistidos (escala Zarit, contato com Serviço Social) |

### 2.6 Resolução CFM nº 1.821/2007 — Prontuário Eletrônico

**Referência:** validade jurídica do registro eletrônico; requisitos de prontuário (identificação, autoria, integridade).

| Requisito | Descrição |
|---|---|
| RNF-6.1 | **Autoria e integridade:** todo registro clínico assinado pelo profissional (identificação inequívoca); conteúdo imutável após salvo |
| RNF-6.2 | **Sistema de classificação e registro** compatível com padrões de prontuário (padrão SBIS quando aplicável) |
| RNF-6.3 | **Guarda e prazo de guarda** do prontuário conforme norma (indeterminado em dados de interesse do cidadão) — backup e preservação definidos |

### 2.7 OMS — Estratégia Global de Saúde Digital (WHO, 2021)

**Referência:** transformação digital deve respeitar processos clínicos e fluxos de trabalho; dados padronizados e interoperáveis.

| Requisito | Descrição |
|---|---|
| RNF-7.1 | A digitalização deve **respeitar o fluxo clínico** (SOAP, CIF, cogestão) e reduzir carga burocrática — nunca aumentar trabalho de registro |
| RNF-7.2 | **Interoperabilidade:** adoção de padrões abertos (HL7 FHIR) e capacidade de evoluir para a Rede Nacional de Dados em Saúde (RNDS) |
| RNF-7.3 | **Terminologias padronizadas:** CID-10, CIAP-2 e CIF como vocabulário clínico |

### 2.8 Resolução CNS nº 510/2016 (contexto acadêmico/pesquisa)

**Referência:** ética em pesquisa com dados humanos no âmbito do SUS; dispensa/necessidade de avaliação por Comitê de Ética (CEP).

| Requisito | Descrição |
|---|---|
| RNF-8.1 | Projeto de pesquisa/extensão deve **submeter-se à avaliação ética** cabível (CEP) antes de acesso a dados reais |
| RNF-8.2 | Dados utilizados em pesquisa devem ser **anonimizados/agregados** quando possível; consentimento específico para uso de dados |

---

## 3. Requisitos Não Funcionais Técnicos (derivados das normas)

| Categoria | Requisito | Fonte |
|---|---|---|
| **Segurança** | Criptografia em trânsito e em repouso; controle de acesso por papel (menor privilégio); trilha de auditoria inviolável | LGPD, CFM |
| **Privacidade** | Consentimento explícito e revogável; minimização de coleta; retenção definida | LGPD |
| **Disponibilidade** | Operação offline/cache local com sincronização automática; fluxo nunca parado por indisponibilidade de integração | OMS 2021, prática |
| **Interoperabilidade** | Padrão FHIR; importação e-SUS PEC; evolução para RNDS; terminologias CID/CIAP/CIF | OMS 2021 |
| **Usabilidade** | Preenchimento progressivo e preditivo; registro de recepção ≤ 2 min; interface acessível (WCAG) | LBI, PNH |
| **Auditabilidade** | Registro completo de operações críticas: quem, o quê, quando, por quê | LGPD, CFM |
| **Conformidade** | Elegibilidade por escopo do CER (Portaria 793); fluxo de cogestão (PNH) | Portaria 793, PNH |

---

## 4. Matriz Norma → Requisito (resumo executivo)

| Norma | Requisitos gerados |
|---|---|
| Constituição (1988) | RNF-1.1 a 1.3 — universalidade, integralidade, equidade |
| PNH / Clínica Ampliada (2003) | RNF-2.1 a 2.3 — protagonismo, equipe de referência, discussão de caso |
| Portaria 793/2012 | RNF-3.1 a 3.3 — escopo, PTS agregador, longitudinalidade |
| LGPD (2018) | RNF-4.1 a 4.7 — consentimento, minimização, segurança, auditoria, incidentes |
| LBI (2015) | RNF-5.1 a 5.4 — acessibilidade, linguagem simples, inclusão digital |
| CFM 1.821/2007 | RNF-6.1 a 6.3 — autoria, integridade, guarda do prontuário |
| OMS Saúde Digital (2021) | RNF-7.1 a 7.3 — fluxo respeitado, interoperabilidade, terminologias |
| CNS 510/2016 | RNF-8.1 a 8.2 — ética em pesquisa, anonimização |

---

## 5. Pendências para Verificação (ação até a entrega)

1. **Citação literal** da Portaria 793/2012 (artigos sobre CER e PTS).
2. **Teor exato** da Resolução CFM 1.821/2007 (requisitos de prontuário eletrônico).
3. **Artigos específicos** da LGPD (5º, 7º, 11, 48) para citação formal.
4. **Enquadramento de pesquisa** junto ao CEP (RNF-8.1) — decisão institucional.
5. Confirmação da **norma vigente de retenção de prontuário** no SUS (guarda legal).

Fonte: plano/01 §11 (marco normativo) e plano/05 §7.3 (requisitos não funcionais).