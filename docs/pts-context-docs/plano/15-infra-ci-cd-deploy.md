# 15 — Infraestrutura, CI/CD e Deploy

> **Input:** `plano/07` (capacidade, riscos) · **Decisão:** ADR 0007 (Docker-first) · **Nível:** ambientes, build, pipeline, segurança, backup

## 1. Ambientes

| Ambiente | Composição | Uso |
|---|---|---|
| **dev** | `docker compose up`: app (hot reload) + postgres:16 + mailhog | desenvolvimento local |
| **staging** | mesma imagem + postgres; dados fake | PR/validação |
| **prod** | mesma imagem + postgres; dados reais | piloto CER (Fase 1/2) |

Mesma imagem nos três — só varia configuração (env). Portabilidade garantida por `Dockerfile` multi-stage.

## 2. Docker

- `Dockerfile` multi-stage: `pnpm` build (deps + build) → runtime **Node 22 slim**, user non-root.
- Criptografia/arquivos de deploy não entram na imagem; tudo via env (secrets no CI, nunca no repo).
- `docker-compose.yml` (dev): app, `postgres:16` (volume + backup), `mailhog` (notificações dev).
- Healthchecks: `pg_isready` para o banco; endpoint de health do app no entrypoint.
- Migrations: `prisma migrate deploy` no entrypoint **antes** de subir o app em prod; nunca auto-apply em dev (`prisma migrate dev`).

## 3. Pipeline GitHub Actions

```
┌─ ci.yml (PR + main)────────────────────────────────────────┐
│  install (pnpm) → typecheck → lint → vitest →              │
│  prisma generate + migrate (test db) → build → playwright e2e │
└────────────────────────────────────────────────────────────┘
┌─ deploy-staging.yml (PR)───────────────────────────────────┐
│  build imagem → push registry → deploy staging → smoke test │
└────────────────────────────────────────────────────────────┘
┌─ deploy-prod.yml (main)────────────────────────────────────┐
│  build imagem → push registry → migrate deploy → deploy    │
│  → health check → backup pós-deploy                        │
└────────────────────────────────────────────────────────────┘
```

- **Gates**: CI falhou → sem deploy. `ci.yml` é obrigatório em PR e main.
- **Secrets**: `secrets.*` do GitHub Actions; `.env*` no `.gitignore`; exemplos em `.env.example`.
- **Cache**: `pnpm` store + `next build` cache entre runs.

## 4. Deploy (Docker-first, alvo plugável)

1. CI publica a **imagem Docker** num registry (GHCR) — imutável, versionada por SHA.
2. Alvo escolhido na Fase 2 (meio-termo entre VPS e plataforma gerenciada):
   - **VPS + Docker Compose + Caddy** (TLS): controle total, sem custo fixo — alinhado ao contexto acadêmico (doc 07: "sem servidor próprio garantido").
   - **Railway/Fly.io/Render**: deploy via mesma imagem, menos manutenção.
3. O código não muda quando o alvo mudar — só o passo final do workflow.

## 5. Segurança

- **Em trânsito**: TLS (Caddy/plataforma) — obrigatório em prod.
- **Em repouso**: `pgcrypto` para campos sensíveis; criptografia no nível do disco na infra.
- **Autenticação**: senha com hash forte; sessão HttpOnly/Secure; Gov.br como provider OIDC futuro.
- **Autorização**: RBAC + vinculação ao caso (`iam`); RLS por `cerId` habilitado na Fase 2 (ADR 0002, schema já preparado).
- **Auditoria**: trilha append-only; logs técnicos separados de dados clínicos.
- **LGPD**: consentimento registrado/revogável; minimização; plano de resposta a incidente (RNF-4.x).

## 6. Backup e retenção

- `pg_dump` agendado (cron no host ou task no compose) + retenção (ex.: 7 dias diário, 4 semanas semanal, 12 meses mensal — ajustar por norma de guarda de prontuário).
- Backup pós-deploy no workflow de produção.
- Restauração testada periodicamente (staging a partir de backup).

## 7. Observabilidade (mínima)

- Logs estruturados (`lib/logger`); request id.
- Healthcheck HTTP (L7) para orquestrador.
- `ponytail:` APM/OpenTelemetry adiado até o piloto mostrar necessidade; logs + health bastam.

## 8. Referências

- Fluxo de engenharia e rituais: `plano/16`.
- Requisitos não funcionais: `Perguntas/04`.
