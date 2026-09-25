# Contexto — PTS Digital

Linguagem ubíqua do domínio. Vocabulário canônico usado em código, testes, specs e documentação. Criar/manter via skill `domain-modeling`.

## Termos núcleo

- **PTS** (Projeto Terapêutico Singular): instrumento de gestão do cuidado individual no CER; agrega avaliações, metas, eventos e discussões de um caso.
- **CER** (Centro Especializado em Reabilitação): unidade de saúde onde o PTS opera. Escopos: Física, Intelectual, Visual, Auditiva.
- **PCD** (Pessoa com Deficiência): usuário do CER, titular do PTS.
- **Cogestão do cuidado**: processo no qual metas são pactuadas entre equipe e usuário/cuidador, em linguagem acessível — nunca apenas prescritas.
- **Pactuação de metas SMART**: registro de meta com dono, prazo, descrição técnica e descrição em linguagem acessível.
- **Linha de base**: dados clínicos/cadastrais importados do e-SUS PEC, revisáveis, com origem registrada por campo.
- **Contrarreferência**: guia justificada + plano de cuidados devolvido à APS/UBS no encerramento.
- **Equipe de referência**: conjunto de profissionais vinculados a um PTS; o profissional de referência conduz acompanhamento e revisões.
- **Link do cidadão**: credencial de acesso do paciente ou cuidador ao **próprio** PTS. Rota pública, sem conta e sem sessão — o código no fim da URL é a credencial, e o banco guarda só o hash. Um link ativo por PTS, validade de 30 dias.

## Regras e classificações

- **Semáforo do Cuidado**: classificação de prioridade. `VERDE` = retorno à APS; `AMARELO` = fila de espera ativa com tempo estimado; `VERMELHO` = admissão imediata.
- **Semáforo de Reunião**: canal de discussão do caso. `VERDE` = aprovação digital; `AMARELO` = assíncrona; `VERMELHO` = presencial.
- **Status do PTS**: `EM_AVALIACAO` → `PACTACAO` → `SEGUIMENTO` → `REAVALIACAO` → `FECHADO`.
- **Status de meta**: `NOVA` / `EM_ANDAMENTO` / `CONCLUIDA` / `NAO_ALCANCADA`.
- **Ajuste clínico manual**: divergência do algoritmo (semáforo, elegibilidade) exige justificativa auditável.
- **Divergência saudável**: comparativo relatado (família) × percebido (clínica) — direcional, nunca bloqueante.
- **Origem de dado**: `importado` (e-SUS) / `digitado` / `calculado` — rastreável por campo.

## Fluxos

- **Recepção**: busca CPF/CNS → linha de base → cuidador (Zarit) → consentimento LGPD → validação PPI.
- **Triagem**: 3 eixos (clínico, funcional, social) → elegibilidade por escopo → semáforo → fila/contrarreferência.
- **SOAP**: Subjetivo, Objetivo, Avaliação, Plano (grade de serviços com frequência/duração/justificativa).
- **Avaliação multiprofissional**: checklist por especialidade → códigos CIF gerados em background.
- **Reavaliação**: gatilho → nova versão do PTS → comparativo entre versões.
- **Encerramento**: alta / contrarreferência / descontinuação — justificativa obrigatória.
- **Acesso do cidadão**: triagem abre o caso → profissional gera o link → recepção entrega em mãos → cidadão abre e acompanha percurso e metas.

## Portal do cidadão

- **Quem pode gerar o link**: quem tem a permissão `portal.cidadao.acesso` — recepção, papéis clínicos (triador, médico, fisioterapeuta, terapeuta ocupacional, psicólogo, referência) e gestor. `ADMIN` **não** gera: é papel técnico, só `admin.*` e governança. Quem se auto-cadastrou também não, até o admin aprovar e atribuir o papel profissional. O gestor entra porque o link não é conteúdo clínico — é o cidadão acessando o PTS dele.
- **Restrições à emissão**: o profissional precisa ser do **mesmo CER** do PTS (link nunca atravessa unidade) e o PTS precisa existir — o link só passa a valer depois que a triagem abre o caso; sem PTS ativo a ficha explica o aguardo. Vínculo com a equipe do caso **não** é exigido, ao contrário de quase todo o resto do PTS: basta a permissão e o mesmo CER. Geração e revogação ficam na trilha de auditoria com o profissional como ator.
- **Onde e quando**: na ficha do paciente (tela de trabalho da recepção) e no painel do caso (para a equipe clínica). Emitir de novo **revoga** o link anterior na mesma transação, sem `delete` — é o caminho de "não confio mais naquele link". Validade de 30 dias. A entrega é física, porque paciente não tem telefone nem e-mail cadastrado.
- **Auditoria do acesso não é robusta — e isso é por desenho, não por esquecimento.** O acesso do cidadão não vira linha de auditoria: o sistema não tem identidade do cidadão, e forçar um usuário na trilha seria inventar dado. Cada abertura vira uma linha em log de acesso com **o instante**, e a equipe vê "último acesso" e "total de acessos" na tela do caso.
- **O que esse registro realmente garante**: o log presume que quem abriu o link é o próprio cidadão, e essa é uma suposição, não uma verificação. Na prática, **qualquer pessoa com o link acessa o PTS** — inclusive quem não é o paciente nem o cuidador — e nada no sistema permite descobrir quem foi. Link vazado vale até a revogação ou a expiração. O controle real é a emissão e a revogação, não a auditoria; por isso o código tem ~50 bits, expira em 30 dias e a entrega é presencial. Falha ao registrar o instante nunca bloqueia a visão do cidadão (mesmo princípio de ADR-0008).

## Múltiplos contextos

Repo monolito modular com bounded contexts em `src/server/` (`care-plan`, `reception`, `triage`, `clinical`, `governance`, `iam`, `integrations`). Se futuramente virar multi-repo, criar `CONTEXT-MAP.md` na raiz.
