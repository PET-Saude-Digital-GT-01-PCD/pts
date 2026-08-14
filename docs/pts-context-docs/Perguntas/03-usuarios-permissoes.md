# Pergunta 3 — Usuários: Atores e Permissões

## Perfis que utilizarão o sistema e suas permissões

---

## 1. Objetivo

Identificar os perfis (atores) da plataforma PTS Digital, definir o que cada um pode **ver e fazer** e estabelecer o princípio de controle de acesso. Base: princípio do **menor privilégio** — nenhum papel acessa além do necessário ao seu trabalho.

---

## 2. Mapa de Atores

| # | Ator | Instituição | Papel no fluxo |
|---|---|---|---|
| 1 | **Recepção** | CER | Porta de entrada: cadastro, consentimento, cuidador |
| 2 | **Triador** (enfermagem/serviço social/regulador) | CER | Elegibilidade, priorização, contrarreferência |
| 3 | **Médico** (fisiatra) | CER | Avaliação SOAP, diagnóstico funcional, grade de serviços |
| 4 | **Terapeutas** (Fisio, T.O., Psico) | CER | Avaliações especializadas, metas, mural |
| 5 | **Profissional de referência** | CER | Acompanhamento do caso, articulação, revisões |
| 6 | **Gestor/Coordenação** | CER / Secretaria | Dashboards, indicadores, auditoria |
| 7 | **Usuário (PCD) e Cuidador** (portal) | Cidadão | Visualização do percurso, metas, consentimento |
| 8 | **Administrador técnico** | TI | Configuração, usuários, integrações |

---

## 3. Matriz de Permissões por Perfil

**Escopo** = conjunto de PTS acessíveis. **Ações** = operações permitidas.

### 3.1 Recepção
- **Escopo:** casos em triagem/recepção do dia.
- **Permissões:**
  - Criar/editar cadastro do paciente e do cuidador.
  - Registrar consentimento LGPD.
  - Visualizar linha de base importada (não editar dados clínicos).
  - Executar validação PPI e cadastro provisório.
  - **Bloqueado:** acessar avaliações clínicas, metas, mural clínico, relatórios gerenciais.

### 3.2 Triador
- **Escopo:** casos em triagem (todos os do dia).
- **Permissões:**
  - Preencher triagem (3 eixos), aplicar elegibilidade.
  - Ajustar classificação do semáforo **com justificativa obrigatória** (auditável).
  - Emitir guia de contrarreferência.
  - Visualizar linha de base e dados do cuidador.
  - **Bloqueado:** SOAP, metas, relatórios gerenciais, alterar cadastro após triagem concluída (somente com permissão de gestor).

### 3.3 Médico
- **Escopo:** PTS dos casos sob sua avaliação.
- **Permissões:**
  - Registrar avaliação SOAP completa (S/O/A/P).
  - Confirmar/refinar CID/CIAP e definir diagnóstico funcional.
  - Preencher grade de serviços (especialidade, frequência, ciclo, justificativa).
  - Visualizar painel de divergência saudável.
  - **Bloqueado:** editar avaliações de outras categorias, cadastro administrativo, dashboards gerenciais (apenas visões clínicas do próprio caso).

### 3.4 Terapeutas (Fisio / T.O. / Psico)
- **Escopo:** PTS dos casos que atendem.
- **Permissões:**
  - Registrar avaliação da **própria especialidade** (checklist/CIF/AVD).
  - Propor metas e marcar status.
  - Participar do mural do caso.
  - Visualizar metas cruzadas de todas as especialidades do caso (leitura).
  - **Bloqueado:** editar avaliações de outras especialidades, SOAP médico, relatórios gerenciais.

### 3.5 Profissional de Referência
- **Escopo:** PTS sob sua referência.
- **Permissões (superset do clínico de equipe):**
  - Visualizar **todo** o PTS do caso (todas as avaliações, metas, mural, eventos).
  - Registrar eventos de acompanhamento.
  - Acionar gatilhos de reavaliação.
  - Conduzir a pactuação de metas e registrar versões/revisões do PTS.
  - Encaminhar encerramento (alta/contrarreferência) **com justificativa**.
  - **Bloqueado:** modificar avaliações de outros profissionais (apenas leitura), cadastro administrativo, dados de outros PTS fora de sua referência.

### 3.6 Gestor / Coordenação
- **Escopo:** todos os PTS do CER (visão agregada).
- **Permissões:**
  - Dashboards de indicadores, filas e prioridades (Pergunta 6).
  - Relatórios de produção e qualidade.
  - Trilha de auditoria (leitura).
  - Configuração de regras locais (semáforo, escopos de especialidade).
  - **Bloqueado:** **leitura apenas** de dados clínicos individualizados — não edita nem detalha conteúdo clínico de caso específico (LGPD: minimização e finalidade).

### 3.7 Usuário (PCD) e Cuidador — Portal
- **Escopo:** próprio percurso.
- **Permissões:**
  - Visualizar percurso (etapas concluídas, próximos passos).
  - Visualizar metas em **linguagem acessível**.
  - Registrar/revogar consentimento LGPD.
  - Preencher formulário pré-chegada (cuidador) e escala de sobrecarga.
  - Enviar dúvida/mensagem à equipe (canal definido).
  - **Bloqueado:** acesso a qualquer outro dado clínico, qualquer edição de conteúdo técnico.

### 3.8 Administrador Técnico
- **Escopo:** sistema inteiro (configuração, não clínica).
- **Permissões:**
  - Gestão de usuários, papéis e permissões.
  - Configuração de integrações (e-SUS, PPI, Gov.br).
  - Monitoramento de sincronização e logs técnicos.
  - **Bloqueado:** conteúdo clínico (nenhum acesso de leitura a dados de saúde).

---

## 4. Regras Transversais de Acesso

| Regra | Descrição |
|---|---|
| **Menor privilégio** | Perfil acessa apenas dados e ações do seu job (matriz acima) |
| **Vinculação ao caso** | Acesso clínico só a PTS em que o profissional está envolvido (equipe do caso ou referência) |
| **Separação gestão × clínica** | Gestor vê agregados e auditoria; conteúdo clínico individual é restrito à equipe do caso |
| **Justificativa obrigatória** | Toda ação que diverge do padrão (ajuste de semáforo, encerramento, reabertura) exige motivo auditável |
| **Auditoria integral** | Quem, o quê, quando e por quê em toda ação crítica (classificação, meta, encerramento, consentimento) |
| **Consentimento** | Tratamento de dados do usuário exige consentimento registrado e revogável (LGPD) |
| **Acesso em modo histórico** | PTS fechado vira somente leitura para a equipe; gestor mantém visão agregada |

---

## 5. Fluxo de Atribuição de Papéis

1. **Administrador técnico** cadastra usuários e atribui papel de base (ex.: "terapeuta fisioterapeuta").
2. **Gestor** vincula o profissional aos casos/PTS e à **equipe de referência**.
3. **Profissional de referência** é atribuído **no nascimento do PTS** (Pergunta 1, etapa triagem).
4. Mudanças de papel são **auditadas** (histórico de quem atribuiu e quando).

---

## 6. Tabela-Resumo (visão executiva)

| Perfil | Vê | Faz | Não pode |
|---|---|---|---|
| Recepção | Cadastro, cuidador, linha de base | Cadastrar, consentir, validar PPI | Dados clínicos |
| Triador | Triagem, cuidador, base | Triar, priorizar, contrarreferir | SOAP, metas, relatórios |
| Médico | SOAP + painel divergência | Avaliar, prescrever serviços | Outras categorias, cadastro, gerência |
| Terapeutas | Própria especialidade + metas (leitura) | Avaliar, propor metas, mural | Outras especialidades, SOAP |
| Profissional de referência | PTS completo do caso | Acompanhar, pactuar, revisar, encerrar | Modificar avaliações alheias, outros casos |
| Gestor | Dashboards, relatórios, auditoria | Analisar, configurar regras locais | Editar dados clínicos |
| Usuário/Cuidador | Próprio percurso e metas (linguagem acessível) | Consentir, pré-chegada, dúvidas | Qualquer conteúdo técnico |
| Admin técnico | Logs e configuração | Usuários, integrações, monitoramento | Dados de saúde |

Fonte: plano/06 §5 (papéis e permissões) e plano/03 (personas).