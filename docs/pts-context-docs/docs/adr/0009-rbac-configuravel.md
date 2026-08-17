# ADR-0009: RBAC configurável por papel (catálogo dinâmico)

## Status
Aceito

## Contexto
O controle de acesso usa hoje enum fixo `Papel` (campo único em `usuario`). Cada organização tem perfis próprios ("fisioterapeuta", "cargo de limpeza", etc.) e precisa adaptar permissões sem deploy. Org sem equipe técnica não pode editar código. Além disso, a matriz de permissões (`Perguntas/03`) tem regras de governança clínica e LGPD que não podem ser desligadas por configuração.

Considerou-se herança OO de entidades (classe `Pessoa`, `Profissional`...) — rejeitada: muda perfil = muda código + deploy; não resolve autonomia.

## Decisão
- Controle de acesso **data-driven (RBAC dinâmico)**: catálogo `papel` criado pelo admin da org + catálogo fixo `recurso` + matriz `papel_recurso`.
- **Um papel por usuário** (`usuario.papelId`); permissão efetiva = união dos recursos do papel.
- **Camada de guardrails em código** (não configurável por admin):
  - Papel com base `GESTOR` nunca ganha recurso clínico (`soap.*`, `avaliacao.*`).
  - `papeis.gerenciar`, `config.*`, `usuarios.aprovar` somente para base `ADMIN`.
  - ≥ 1 admin ativo; papel em uso não deleta.
  - Mudança de papel/permissão grava auditoria.
- Papel carrega `base` (enum `CLINICO | GESTOR | ADMIN`) que ancora guardrails; admin customiza nome e recursos **dentro** da base.
- Profissional de referência é vínculo por caso (`pts.refProfissionalId`), não papel global.
- `categoriaProfissional` permanece como metadado informativo, não permissão.

## Consequências
- Positivas: org adapta perfis/permissões via UI sem deploy; menor privilégio preservado; LGPD mantido pelos guardrails.
- Negativas: enums fixos (`papel`, `categoriaProfissional`) migram para tabelas (migration estrutural única); requirePapel → requirePermissao em todo usecase; permissão "espalhada" exige auditoria de mudanças.
- `ponytail:` papel único por usuário (não N:M); upgrade = tabela `usuario_papel` quando orgs pedirem perfis compostos em volume. Papéis combinados resolvem casos pontuais ("Fisio + Triador") sem N:M.