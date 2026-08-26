# RUNBOOK — Protocolo comum das sessões autônomas

Vale para TODAS as sessões (S1–S5). Leia antes de começar e siga à risca. Você é um agente autônomo: **não pergunte, decida** conforme este runbook + o corpo da issue (`gh issue view <n>` é a fonte única de verdade).

## 0. Pré-voo (uma vez por sessão)

```bash
docker compose up -d db mailhog
pnpm install
pnpm db:deploy        # aplica migrações existentes
pnpm db:seed          # seed dev (idempotente)
pnpm typecheck && pnpm lint && pnpm test   # sanity: develop precisa estar verde
```

Se o sanity falhar em develop limpo → outro PR quebrou develop. Regra "develop quebrado" abaixo.

## 1. Regras de ouro (guardrails)

- Branches sempre novas a partir de `origin/develop` atualizado. **Nunca** commitar direto em `develop` ou `main`. Nunca force-push.
- **Não toque em**: `src/server/iam/` (Bloco B em andamento pela equipe), issues #15 e #26, `docs/adr/` (ADRs são lei).
- Auditoria **na mesma transação** da mutação crítica. Append-only (nunca update/delete em auditoria, consentimento, ajuste de classificação).
- Dado clínico sempre dentro do PTS (FK `RESTRICT`). Nada órfão.
- Lock otimista (`versao`): update com versão velha → erro 409 com mensagem clara.
- Permissões via RBAC data-driven: use os helpers existentes em `src/server/iam/` (`temPermissao` / requirePermissao) com chaves do catálogo em `prisma/seed.ts`. Nunca cheque por papel/categoria.
- Funções puras de regra (semáforo, elegibilidade, conflitos, CIF, divergência) = **TDD obrigatório** (red → green → refactor), sem I/O, determinísticas.
- Validação zod em todo payload de server action (fronteira de confiança).
- Fontes: font stack do sistema. Proibido `next/font/google`.
- Simplificações deliberadas recebem comentário `ponytail:` (teto + caminho de upgrade).
- Conventional Commits em PT-BR (`feat(triage): ...`), branch `feature/<slug-curto>`.
- **Nunca commitar** `opencode.jsonc`, `.env`, `tsconfig.tsbuildinfo`, `test-results/`.
- Antes de concluir qualquer tarefa: `pnpm typecheck && pnpm lint && pnpm test` verdes.

## 2. Ciclo por issue

Para cada issue da sua fila, EM ORDEM:

```bash
# 1. Base fresca
git fetch origin
git switch -c feature/<slug> origin/develop

# 2. Migrações (se outra sessão mergeou schema enquanto isso)
pnpm db:deploy

# 3. Ler a issue completa
gh issue view <n>

# 4. Implementar (TDD onde exigido). Testes unit em tests/, e2e em e2e/.

# 5. Verificação local COMPLETA
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# 6. E2E sob lock (porta 3000 compartilhada entre sessões!)
flock /tmp/pts-e2e.lock pnpm e2e

# 7. Status: atualize seu arquivo de status NO MESMO PR
#    plano-execucao/status/S<n>.md  (append de uma linha, formato no STATUS.md)

# 8. Commit, push, PR, merge
git add -A && git commit -m "feat(<contexto>): <resumo> (#<issue>)"
git push -u origin feature/<slug>
gh pr create --base develop --title "<título>" --body "Closes #<issue>. <notas>"
gh pr merge --squash --delete-branch

# 9. Fechar issue e voltar à fila
gh issue close <n> --comment "Entregue no PR merged; CI observando."
git fetch origin
```

### Dependência cruzada (issue bloqueada por PR de OUTRA sessão)

Antes de iniciar a issue, cheque:

```bash
gh pr list --state merged --search "<título ou branch esperado>" --limit 5
# ou, se souber o número do PR:
gh pr view <pr> --json state --jq .state   # espere até "MERGED"
```

- Não merged ainda → durma 60s e repita. Timeout: **60 min**. Esgotou → marque a issue como `DEFERRED` no seu status e pule para a próxima da fila não dependente. Ao fim da fila, volte aos deferred e repita o polling (mais 60 min). Ainda bloqueada → registre BLOCKED e encerre.
- Enquanto espera, você PODE adiantar leitura/rascunho de testes da issue bloqueada em stash, mas só commite após a dependência mergear.

## 3. Banco de dados e migrations

- Só crie migration se sua issue precisar (hoje: apenas #25 e #6 adicionam models).
- Migration nova: `pnpm db:migrate -- --name <nome>` (cria + aplica em dev).
- Depois de puxar merges de outros: `pnpm db:deploy` sempre.
- Se duas sessões colidirem na migration ao mesmo tempo (erro de concorrência do banco): aguarde 30s, `pnpm db:deploy`, reexecute.
- Seed: adições vão em bloco marcado no final de `main()`, antes do `console.log` final:
  ```ts
  // ===== exemplo painel/dashboard (issue #16) =====
  ```
  Idempotente (upsert). Isso minimiza conflito entre sessões.

## 4. Conflitos de merge (schema.prisma, seed.ts)

Todos os edits são append-only em regiões distintas → quase sempre auto-mergem. Se der conflito:

1. `git fetch origin && git rebase origin/develop`
2. Resolva MANTENDO OS DOIS LADOS (modelos/seções são independentes; em relations do Prisma, junte as linhas dos dois lados na lista de relações).
3. `pnpm db:migrate -- --name reconcilia 2>/dev/null || pnpm db:deploy` e rode a suíte completa antes do push (`git push --force-with-lease` só no SEU branch de feature).

## 5. Falhas

- **Verificação local falha no meu código**: corrija (máx. 2 tentativas estruturadas). Persiste → simplifique o escopo ao aceite mínimo da issue, anote `ponytail:` e siga. Ainda quebrado → BLOCKED.
- **Develop quebrado ao começar issue nova** (sanity falha em develop limpo): o culpado provavelmente é o último PR merged. Abra `feature/hotfix-develop` a partir de develop, corrija o mínimo, PR + squash merge imediato, depois prossiga com sua issue.
- **E2E falha 2×** mas unit verde e fluxo manual via curl/tela funciona: registre no status como "e2e pendente", não bloqueie o merge (CI tem retries=2).
- **CI falha pós-merge**: quem pegar develop quebrado aplica a regra acima (hotfix). Não espere pelo autor.

## 6. Definition of Done (por issue)

- [ ] Escopo do corpo da issue entregue (nem mais, nem menos)
- [ ] TDD nas funções puras; unit cobrindo aceite crítico
- [ ] E2E do fluxo principal quando a issue pede
- [ ] zod nas actions; auditoria same-tx; lock otimista onde a issue pede
- [ ] `typecheck && lint && test && build` verdes; `flock /tmp/pts-e2e.lock pnpm e2e` verde
- [ ] PR merged (squash) em develop + issue fechada + linha no `plano-execucao/status/S<n>.md`

## 7. Fim de sessão

Fila vazia (ou tudo deferred/blocked): garanta que seu `status/S<n>.md` reflete o estado final de cada issue (`DONE <pr-url>` / `DEFERRED` / `BLOCKED <motivo>`), faça um último PR `chore(status): sessão S<n>` se sobrou pendência de status, e encerre com relatório curto na conversa.
