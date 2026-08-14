# CI/CD e Deploy

## Pipeline — GitHub Actions

### `ci.yml` (obrigatório em PR e main)

```
checkout → pnpm install (cache) → typecheck → lint → vitest
  → prisma generate + migrate (service postgres:16) → build → playwright e2e
```

- **Gate:** CI falhou → sem merge, sem deploy.
- Banco de teste: serviço `postgres:16` do próprio workflow.
- Cache: pnpm store (via `pnpm/action-setup` + `setup-node`).

Workflows futuros (Fase 2, quando o alvo de deploy for definido — ADR 0007):

- `deploy-staging.yml` — build imagem → push registry → deploy staging → smoke test.
- `deploy-prod.yml` — build → push → `prisma migrate deploy` → deploy → healthcheck → backup.

## Secrets

- Secrets de ambiente ficam em GitHub Actions (`Settings → Secrets`), nunca no repo.
- `.env*` está no `.gitignore`; exemplos em `.env.example`.

## Imagem Docker

- `Dockerfile` multi-stage: `deps` (pnpm install) → `builder` (prisma generate + build) → `runner` (Node 22 slim, **non-root**, standalone output).
- A mesma imagem serve dev, staging e prod — só varia configuração (env).
- Migrations não auto-aplicam em dev; produção roda `prisma migrate deploy` antes de subir o app.

## Alvo de deploy (Fase 2)

Decisão registrada em ADR 0007: imagem portável + compose, alvo **plugável**.

Candidatos:

| Alvo | Prós | Contras |
|---|---|---|
| VPS + Docker Compose + Caddy (TLS) | controle total, sem custo fixo | manutenção própria |
| Railway / Fly.io / Render | menos manutenção, mesmo deploy | custo por uso |

O código não muda quando o alvo mudar — só o passo final do workflow.

## Segurança (resumo)

- TLS obrigatório em produção.
- `pgcrypto` para campos sensíveis; dados clínicos só dentro do PTS (FK `RESTRICT`).
- Auditoria append-only na mesma transação; lock otimista (`version`) → conflito = 409.
- Backup: `pg_dump` agendado + backup pós-deploy. Detalhes: `pts-context-docs/plano/15`.
