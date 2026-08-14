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

## Múltiplos contextos

Repo monolito modular com bounded contexts em `src/server/` (`care-plan`, `reception`, `triage`, `clinical`, `governance`, `iam`, `integrations`). Se futuramente virar multi-repo, criar `CONTEXT-MAP.md` na raiz.
