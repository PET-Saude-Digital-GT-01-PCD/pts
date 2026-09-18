# 15 — Infraestrutura, CI/CD e Deploy

> **Input:** `plano/07` (capacidade, riscos) · **Decisão:** ADR 0011 (Vercel + Supabase), supera ADR 0007 (Docker-first) · **Nível:** ambientes, build, pipeline, segurança, backup
>
> Documento operacional (fonte da verdade pra comandos/setup, mantida em sincronia com este): `docs/05-ci-cd-deploy.md`.

## 1. Ambientes

| Ambiente | App | Banco |
|---|---|---|
| **local** | `docker compose up` / `pnpm dev` | Postgres 16 no compose |
| **stage** | Vercel Preview (branch `develop`) | Supabase `pts-stage` |
| **prod** | Vercel Production (branch `main`) | Supabase `pts-production` |

App via Vercel (Git integration, build nativo Next.js — não usa a imagem
Docker do repo para deploy). `Dockerfile`/`docker-compose.yml` seguem sendo
a forma de rodar o projeto localmente (dev), não mais "mesma imagem em todo
ambiente" (ver ADR-0011).

## 2. Docker (uso local/dev — não é mais o caminho de produção)

- `Dockerfile` multi-stage: `pnpm` build (deps + build) → runtime **Node 22 slim**, user non-root.
- `docker-compose.yml` (dev): app, `postgres:16` (volume), `mailhog` (notificações dev).
- Healthchecks: `pg_isready` para o banco; endpoint de health do app.
- Migrations em dev: `prisma migrate dev` (nunca auto-apply); em stage/prod, ver §3–4 (`db-migrate.yml`, fora da imagem Docker).

## 3. Pipeline GitHub Actions

```
┌─ ci.yml (PR + main)────────────────────────────────────────┐
│  install (pnpm) → typecheck → lint → vitest →              │
│  prisma generate + migrate (test db) → build → playwright e2e │
└────────────────────────────────────────────────────────────┘
┌─ db-migrate.yml (push develop/main)────────────────────────┐
│  prisma migrate deploy no Supabase da branch (stage/prod)  │
│  via STAGE_DIRECT_URL / PROD_DIRECT_URL                    │
└────────────────────────────────────────────────────────────┘
```

Deploy do app não passa por workflow — Vercel builda e publica via Git
integration a cada push em `develop`(Preview)/`main`(Production).

- **Gates**: CI falhou → sem merge. `ci.yml` é obrigatório em PR e main.
- **Secrets**: `secrets.*` do GitHub Actions; `.env*` no `.gitignore`; exemplos em `.env.example`.
- **Cache**: `pnpm` store + `next build` cache entre runs.

## 4. Deploy (Vercel + Supabase, ADR-0011)

1. Push em `develop`/`main` → Vercel builda e publica automaticamente
   (Preview/Production) via Git integration.
2. `db-migrate.yml` aplica `prisma migrate deploy` no projeto Supabase
   correspondente antes/depois do deploy da Vercel (não há orquestração
   forçada entre os dois — migration idempotente e aditiva é prática
   assumida, ver `AGENTS.md` "toda mutação crítica").
3. `DATABASE_URL` = pooler de transação Supabase (6543); `DIRECT_URL` =
   conexão direta (5432), só para `migrate`/`seed`.
4. Setup detalhado (criar projeto Supabase, variáveis, secrets):
   `docs/05-ci-cd-deploy.md`.

## 5. Segurança

- **Em trânsito**: TLS — gerenciado pela Vercel (app) e Supabase (banco), obrigatório em prod.
- **Em repouso**: `pgcrypto` para campos sensíveis; criptografia em repouso gerenciada pelo Supabase.
- **Autenticação**: senha com hash forte; sessão HttpOnly/Secure; Gov.br como provider OIDC futuro.
- **Autorização**: RBAC + vinculação ao caso (`iam`); RLS por `cerId` habilitado na Fase 2 (ADR 0002, schema já preparado).
- **Auditoria**: trilha append-only; logs técnicos separados de dados clínicos.
- **LGPD**: consentimento registrado/revogável; minimização; plano de resposta a incidente (RNF-4.x).

## 6. Backup e retenção

- Backup automático + PITR (point-in-time recovery) do Supabase — substitui
  o `pg_dump` agendado previsto originalmente (ADR-0007/versão anterior
  deste documento).
- Restauração testada periodicamente (staging a partir de backup/PITR).
- Retenção conforme plano Supabase contratado; revisar se cobre a norma de
  guarda de prontuário aplicável antes de ir a produção com dados reais.

## 7. Observabilidade (mínima)

- Logs estruturados (`lib/logger`); request id.
- Healthcheck HTTP (L7) para orquestrador.
- `ponytail:` APM/OpenTelemetry adiado até o piloto mostrar necessidade; logs + health bastam.

## 8. Referências

- Fluxo de engenharia e rituais: `plano/16`.
- Requisitos não funcionais: `Perguntas/04`.
