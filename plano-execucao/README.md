# Plano de execução noturna — 17 issues em 5 sessões paralelas

Objetivo: ao acordar, todas as issues da Fase 1 (exceto #15 e #26, que estão com a equipe) entregues, merged em `develop` e documentadas.

## Mapa das sessões

| Sessão | Fila | Prompt |
|---|---|---|
| S1 — Integrações/Baseline/CIF | #2 → #23 → #21 | `S1.md` |
| S2 — Care-plan núcleo | #13 → #16 → #25 | `S2.md` |
| S3 — Recepção + Triagem | #3 → #19 → #18 | `S3.md` |
| S4 — Triagem pura + SOAP | #4 → #14 → #5 → #22 | `S4.md` |
| S5 — Reunião/Dashboard/Metas | #17 → #24 → #6 → #20 | `S5.md` |

Protocolo comum: `RUNBOOK.md`. Resultados: `status/S<n>.md`. Rotina da manhã: `STATUS.md`.

## Passo 1 — Commitar o plano ANTES de lançar as sessões

As sessões leem estes arquivos do repo:

```bash
git checkout develop && git pull
git add plano-execucao/
git commit -m "chore: plano de execução noturna (5 sessões)"
git push
```

## Passo 2 — Permissões do opencode (modo autônomo)

Crie/ajuste `opencode.jsonc` na raiz (não comitar se não quiser; as sessões precisam dele local):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "edit": "allow",
    "bash": { "*": "allow" },
    "webfetch": "allow"
  }
}
```

Revogar depois de acordar.

## Passo 3 — Worktrees (isola as 5 sessões)

Cinco sessões no mesmo diretório brigarariam pelo `git switch`. Cada uma recebe um worktree próprio:

```bash
git worktree add --detach ../pts-s1 develop
git worktree add --detach ../pts-s2 develop
git worktree add --detach ../pts-s3 develop
git worktree add --detach ../pts-s4 develop
git worktree add --detach ../pts-s5 develop
```

(`--detach`: o worktree principal já ocupa o branch `develop`. Cada sessão cria seus próprios branches de feature a partir de `origin/develop` — ver RUNBOOK §2.)

## Passo 4 — Setup do ambiente (uma vez)

```bash
docker compose up -d db mailhog
cd ../pts-s1 && pnpm install && pnpm db:deploy && pnpm db:seed
```

Deixe o Docker rodando a noite toda.

## Passo 5 — Lançar as 5 sessões

Em 5 terminais: `cd ../pts-s1 && opencode` (idem s2..s5). Em cada sessão, cole como PRIMEIRA mensagem o conteúdo integral do respectivo prompt (`S1.md` ... `S5.md`).

Alternativa não-interativa (log em arquivo):

```bash
opencode run "$(cat plano-execucao/S1.md)" > /tmp/s1.log 2>&1 &
```

Ordem de lançamento: qualquer uma. Bloqueios cruzados são resolvidos por polling automático (RUNBOOK §2).

## O que cada sessão faz sozinha

- Branch nova de `origin/develop` por issue; TDD onde exigido.
- Verificação completa antes do merge: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + e2e sob lock (`flock /tmp/pts-e2e.lock pnpm e2e`).
- PR + squash merge imediato em develop + `gh issue close`.
- Dep cruzada: polling de 60 min; esgotou → DEFERRED e pula pra próxima.
- 2 tentativas falhas → BLOCKED e pula. Develop quebrado por outro PR → hotfix mínimo e segue.
- Status appendado em `plano-execucao/status/S<n>.md` dentro do próprio PR.

## Rotina da manhã

Seguir `STATUS.md` §"Como revisar pela manhã": status consolidado, PRs merged, CI verde, issues fechadas. Depois: revisar PRs com cuidado (auto-merge sem revisão humana), revogar permissões do `opencode.jsonc`, fechar epic #26 se tudo certo.

## Escopo noturno (17 issues)

#2 #3 #4 #5 #6 #13 #14 #16 #17 #18 #19 #20 #21 #22 #23 #24 #25
Fora: **#15** (equipe), **#26** (epic).
