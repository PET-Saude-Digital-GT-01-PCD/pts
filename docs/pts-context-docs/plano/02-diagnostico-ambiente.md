# 02 — Diagnóstico do Ambiente

> **Input:** `01-fundamentos-teoricos.md` · **Skills:** `pestle-analysis`, `porters-five-forces`, `swot-analysis`, `competitor-analysis`

## 1. Objetivo

Mapear o ambiente em que a plataforma PTS Digital entrará: fatores macro (PESTLE), dinâmica do setor (5 Forças), posição atual (SWOT) e concorrência. Este diagnóstico fundamenta a estratégia do documento 04.

## 2. Análise PESTLE

### 2.1 Político

- **Fortalecimento do SUS e da Rede de Cuidados à Pessoa com Deficiência** como política de Estado; continuidade do financiamento de reabilitação.
- **Programas de digitalização do SUS**: estratégia de Saúde Digital (e-Saúde), Rede Nacional de Dados em Saúde (RNDS), crescimento do e-SUS.
- Risco: alternância de prioridades de governo e cortes orçamentários em saúde digital; paralisia de projetos por mudança de gestão.
- Política de **Compras Públicas**: aquisição de software via pregão/ata de registro — processo lento, porém canal de entrada determinante no setor público.

### 2.2 Econômico

- Financiamento público (SUS) é a principal fonte; **orçamento limitado e disputado** entre os pontos da rede.
- Restrição de recursos de TI nos CER: hardware, conectividade e pessoal técnico escassos.
- Custo de oportunidade: cada hora de atendimento gasta em burocracia representa desperdício mensurável; plataforma que reduz burocracia libera capacidade sem novo custo de pessoal.
- No cenário acadêmico: solução de baixo custo de implementação é viável como projeto de extensão/TCC, sem depender de orçamento comercial.

### 2.3 Social

- Crescimento do envelhecimento populacional e aumento de condições crônicas e deficiências — **pressão sobre a reabilitação**.
- Vulnerabilidade social de parcela relevante dos usuários do CER: exclusão digital, baixa escolaridade, dependência de transporte.
- Exigência crescente de **centralidade da pessoa e do cuidador** no cuidado, com atenção à sobrecarga do cuidador.
- Aceitação de tecnologia por profissionais de saúde em alta, mas com resistência a mudanças de fluxo de trabalho quando não há participação na concepção.

### 2.4 Tecnológico

- **Padrões abertos** disponíveis: HL7 FHIR, CIF, CID-10/CIAP-2 — base de interoperabilidade já consolidada.
- **RNDS** e APIs do e-SUS PEC em evolução: possibilidade real de integração, mas com maturidade variável entre municípios.
- Autenticação e assinatura digitais: **Gov.br** e certificados digitais viabilizam consentimento e assinatura eletrônica.
- Ferramentas de desenvolvimento de baixo custo e código aberto reduzem barreira de entrada técnica.
- Restrição: infraestrutura de conectividade dos CER e capacidade de manutenção local de sistemas próprios.

### 2.5 Legal

- **LGPD (13.709/2018)**: dados de saúde são sensíveis — exige consentimento, minimização, segurança e registro de tratamento. Não conformidade = risco de sanção e perda de confiança.
- **CFM** e normas de prontuário eletrônico: validade jurídica do registro eletrônico (Resolução CFM nº 1.821/2007; SBIS).
- Marcos normativos do PTS e CER: Portaria 793/2012, política da Clínica Ampliada — o software deve **respeitar o fluxo normativo**, não contrariá-lo.
- Leis de **acessibilidade** (Lei Brasileira de Inclusão — 13.146/2015): o sistema deve atender PCD e cuidadores em seus próprios dispositivos.

### 2.6 Ambiental

- Sustentabilidade do cuidado: redução de deslocamentos desnecessários (teleatendimento/avaliação remota) como bônus ambiental.
- Redução de papel nos serviços — objetivo alinhado ao programa Brasil Saudável e à própria digitalização do SUS.
- Baixo impacto direto; tratado como co-benefício, não driver de decisão.

## 3. As 5 Forças de Porter

### 3.1 Rivalidade entre concorrentes existentes — **Média/Alta**

- Prontuários eletrônicos públicos e privados (e-SUS PEC, sistemas municipais, grandes players MV/Tasy/DBServer) disputam espaço de registro clínico.
- Nenhum atende especificamente o **fluxo do PTS em CER** — a especificidade do domínio é a lacuna. Rivalidade concentra-se na infraestrutura de registro, não na funcionalidade de cogestão.

### 3.2 Ameaça de novos entrantes — **Alta**

- Barreira técnica baixa (padrões abertos, open source); barreira de entrada real é o **conhecimento do domínio clínico-normativo** e a **relação com o setor público**.
- Startups de health tech e projetos acadêmicos/extensionistas entram com facilidade em fases piloto.
- Diferencial defensável: profundidade do modelo do PTS + integrações reais com e-SUS/RNDS.

### 3.3 Poder de barganha dos compradores — **Alto**

- Comprador é o **poder público** (gestores municipais/estaduais, CER): processo de compra por licitação, múltiplos fornecedores disputando preço, exigências de conformidade.
- Uma vez integrado ao fluxo diário do serviço, **custo de troca** cresce — janela para lock-in por valor, não por contrato.
- Gestores pressionam por custo; profissionais por usabilidade; ambos por resultados mensuráveis.

### 3.4 Poder de barganha dos fornecedores — **Baixo/Médio**

- Fornecedores-chave são plataformas de interoperabilidade (e-SUS, RNDS) e infraestrutura (Gov.br). São públicos e gratuitos, mas **controlam o ritmo da API** — dependência unilateral.
- Ferramentas de desenvolvimento (open source) têm baixo poder de barganha.

### 3.5 Ameaça de substitutos — **Média**

- Planilhas, papel e prontuários genéricos permanecem como substitutos funcionais para o registro do PTS — exatamente os desafios descritos no documento 01.
- Soluções de prontuário ampliado podem adicionar módulos de PTS no futuro (substituto por evolução), reduzindo a janela de diferenciação.

## 4. Análise SWOT

### Forças (internas)

- Base teórica sólida e normativa (PTS, Clínica Ampliada, Portaria 793/2012).
- Escopo claramente delimitado: fluxo do PTS em CER — domínio com lacuna comprovada de ferramenta.
- Desenho funcional já maduro (6 módulos) nos documentos-fonte.
- Natureza acadêmica: rigor metodológico, acesso a campo, baixo custo de experimentação.

### Fraquezas (internas)

- Sem infraestrutura de produto nem equipe de desenvolvimento alocada ainda.
- Dependência de integração com e-SUS PEC/RNDS (fora do controle da equipe).
- Projeto nasce em contexto acadêmico: risco de não chegar a serviço real sem parceria institucional.
- Capacidade limitada de sustentação/manutenção pós-entrega.

### Oportunidades (externas)

- Lacuna clara de mercado: registro do PTS em CER sem ferramenta dedicada.
- Momentum da saúde digital no SUS (RNDS, e-SUS, telessaúde) — janela favorável.
- Política pública de reabilitação e inclusão em expansão (demanda crescente).
- Possibilidade de parcerias com universidades, secretarias de saúde e CER para piloto real.

### Ameaças (externas)

- Instabilidade orçamentária e política do SUS pode atrasar adoção.
- Adoção lenta por resistência cultural ao novo fluxo.
- Prontuários genéricos adicionam funcionalidade de PTS e "comoditizam" a proposta.
- LGPD mal tratada pode inviabilizar a solução por confiança e legalidade.
- Conectividade e infraestrutura precárias nos serviços-alvo.

## 5. Análise de Concorrentes

### 5.1 Quadro comparativo

| Concorrente / Alternativa | Tipo | Cobre o fluxo do PTS em CER? | Força | Fraqueza |
|---|---|---|---|---|
| **e-SUS PEC** | Prontuário público (APS) | Não — registro genérico, sem módulo de PTS em CER | Universal, gratuito, já adotado | Não é especializado em reabilitação; fluxo genérico |
| **Sistemas de prontuário municipais/estaduais** | Prontuário público | Parcial — possíveis campos de plano de cuidado | Contexto local, dados integrados | Heterogêneos, baixa padronização, sem inteligência do PTS |
| **MV / Tasy / DBServer (AGHUse)** | Prontuário privado/hospitalar | Não — foco hospitalar/ambulatorial amplo | Robusto, maduro | Custo alto, complexidade, pouco adequado ao fluxo de cogestão do CER |
| **Planilhas / papel** | Substituto manual | Sim, de forma precária | Zero custo, flexível | Fragmentação, perda de histórico, sobrecarga (documento 01) |
| **Startups de health tech** | Novos entrantes | Potencial | Agilidade, foco | Sem domínio normativo consolidado; sem escala no SUS |
| **PTS Digital (proposta)** | Ferramenta dedicada | **Sim — por desenho** | Domínio, fluxo completo, cogestão | Sem infraestrutura, depende de integrações externas |

### 5.2 Posicionamento competitivo

A proposta não compete na infraestrutura de registro — compete na **especialização do fluxo**: é a única opção desenhada desde a origem para o ciclo de vida do PTS em CER (recepção → triagem → SOAP → avaliações multiprofissionais → cogestão → governança). A estratégia é de **complementaridade** com o e-SUS PEC (integração via FHIR), não de substituição.

## 6. Síntese para a Estratégia

- **Janela de oportunidade:** especialização no PTS/CER + momentum de digitalização do SUS.
- **Caminho de entrada:** parceria com CER real (piloto) e integração com e-SUS PEC, posicionando a solução como complemento, não concorrente.
- **Fatores críticos de sucesso:** conformidade LGPD, usabilidade para profissionais sobrecarregados, resultados mensuráveis para gestores, e respeito ao fluxo normativo e clínico.
- **Risco central a vigiar:** janela curta antes de prontuários genéricos incorporarem funcionalidade similar — agilidade na entrega do piloto importa.
