# 17 — RBAC Configurável + Admissão + Multi-Instância (Plano Consolidado)

> **Input:** ADR-0009, ADR-0010, `Perguntas/03` · **Nível:** plano de implementação dos blocos de controle de acesso, admissão e identidade da org.

## 1. Objetivo

Dar autonomia a cada organização (instância própria) para adaptar perfis, permissões, campos de cadastro e identidade visual — sem que a organização precise de equipe técnica para editar código. Preservando governança clínica e LGPD via guardrails não configuráveis.

## 2. Decisões registradas (resumo)

| Decisão | Escolha |
|---|---|
| Modelo de deploy | Deploy-per-org (ADR-0010): app distribuída, 1 org = 1 instância (`docker compose`) |
| Controle de acesso | RBAC data-driven (ADR-0009): catálogo de papéis dinâmico, recursos fixos, matriz N:M |
| Papéis por usuário | Um papel por usuário (`usuario.papelId`); referência = vínculo por caso (`pts.refProfissionalId`) |
| Guardrails | Em código, não desligáveis (LGPD + governança clínica) |
| Categoria profissional | Permanece como metadado informativo, não permissão |
| Admissão | Auto-cadastro → `PENDENTE` → admin aprova → `ATIVO`; admin também cadastra direto |
| Branding | Só identidade: nome, logo e parceiros por URL; tema claro/escuro fixo PTS |
| Herança OO de entidades | Rejeitada (ADR-0009): autonomia vem de dados configuráveis, não de hierarquia de classes |

## 3. Catálogo mínimo de `recurso`

| Grupo | Chaves |
|---|---|
| recepcao | paciente.cadastrar · paciente.ver · consentimento.registrar · baseline.ver |
| triage | triagem.escrever · triagem.ver · semaforo.ajustar · contrarreferencia.emissao |
| clinical | soap.ler · soap.escrever · avaliacao.ler · avaliacao.escrever |
| care-plan | meta.ler · meta.escrever · pts.revisar · pts.encerrar · mural.ler · mural.escrever |
| governanca | dashboard.ver · auditoria.ver · relatorios.ver |
| admin | usuarios.ver · usuarios.criar · usuarios.aprovar · papeis.gerenciar · config.org.editar |

Seed: papéis base atuais (RECEPCAO, TRIADOR, MEDICO, FISIOTERAPEUTA, TERAPEUTA_OCUPACIONAL, PSICOLOGO, REFERENCIA, GESTOR, ADMIN) migram para a tabela `papel` com a matriz padrão de `Perguntas/03`. Admin pode criar novos papéis e ajustar recursos dentro da base.

## 4. Guardrails (em código, TDD obrigatório)

- Papel base `GESTOR` nunca ganha recurso clínico (`soap.*`, `avaliacao.*`).
- `papeis.gerenciar`, `config.*`, `usuarios.aprovar` somente para base `ADMIN`.
- ≥ 1 admin ativo por instância; papel em uso não deleta.
- Mudança de papel/permissão grava auditoria (ADR-0005).
- Login bloqueado se `PENDENTE`/`BLOQUEADO`.

## 5. Blocos de construção

### Bloco A — RBAC dinâmico
- Prisma: `papel` (cerId, nome, descricao, `base` enum CLINICO\|GESTOR\|ADMIN, ativo), `recurso` (chave unique, grupo, descricao), `papel_recurso` (papelId, recursoId). `usuario`: +`papelId`, +`status` enum PENDENTE\|ATIVO\|BLOQUEADO, +`camposDinamicosJson`.
- Migração: enum `Papel` → tabela + seed. `requirePapel` → `requirePermissao("soap.ler")` em todos os usecases.
- Admin UI: CRUD de papéis + matriz recurso × papel (checkbox).
- Guardrails com testes unit (lógica pura).

### Bloco B — Self-registration + aprovação
- `formulario_config` (cerId, entidade, campo, rótulo, obrigatório, visível, tipo, opções): admin define os campos do perfil.
- Rota pública `/cadastro` (sem auth): campos dinâmicos da org → usuário `PENDENTE`.
- `authorize` do Auth.js bloqueia login se `PENDENTE`/`BLOQUEADO`.
- Admin UI: fila de pendentes (aprovar/rejeitar com motivo) + CRUD de usuários.

### Bloco C — Branding (ADR-0010)
- `org_config` (cerId unique, nomeExibido, logoUrl, parceirosJson).
- `layout.tsx` async lê `org_config`: header com nome/logo, rodapé com parceiros; `generateMetadata` dinâmico.
- Admin UI: tela "Configurações da org" (recurso `config.org.editar`).
- Tema claro/escuro **inalterado**.

### Bloco D — Equipe do caso (posterior, não bloqueia A–C)
- `equipe_pts` (N:M usuario↔pts) + enforcement de acesso por vinculação ao caso (matriz `Perguntas/03`): leitura clínica restrita à equipe do PTS.

## 6. Ordem e dependências

**A → B → C**. B depende de A (status/papel). C independente (pode ir em paralelo). D depois de A, quando o fluxo clínico pedir vinculação.

## 7. Testes e validação

- Guardrails: TDD (funções puras de autorização).
- Fluxo de admissão: e2e (auto-cadastro → pendente → bloqueio de login → aprovação → acesso).
- Antes de concluir bloco: `pnpm typecheck && pnpm lint && pnpm test`.

## 8. Referências

- `docs/adr/0009-rbac-configuravel.md`, `docs/adr/0010-multi-instancia-orgconfig.md`
- `Perguntas/03-usuarios-permissoes.md` (matriz de permissões)
- `plano/12-modelo-de-dados.md` (schema atual), `plano/11-arquitetura-tecnica.md` (contexto `iam`)