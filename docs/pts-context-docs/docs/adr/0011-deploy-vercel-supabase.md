# ADR-0011: Deploy em Vercel + Supabase (supera ADR-0007)

## Status
Aceito — supera [ADR-0007](0007-docker-first-deploy.md)

## Contexto
ADR-0007 adiou a escolha do alvo de deploy para a Fase 2, mantendo a opção
aberta entre VPS+Compose e plataforma gerenciada, com uma imagem Docker
portável como denominador comum. Chegada a Fase 2, o contexto acadêmico sem
verba de operação (sem alguém dedicado a manter TLS, backup, patch de SO de
um VPS) pesou a favor de uma plataforma totalmente gerenciada em vez de
manutenção própria.

## Decisão
- **App**: Vercel, via Git integration — build nativo Next.js a partir do
  branch (`develop` → Preview/stage, `main` → Production/prod). Não builda
  nem publica a imagem Docker do `Dockerfile` para produção.
- **Banco**: Supabase (Postgres gerenciado) — um projeto por ambiente
  (`pts-stage`, `pts-production`). Pooler de transação (porta 6543,
  `pgbouncer=true`) para a aplicação (`DATABASE_URL`); conexão direta
  (porta 5432) só para `prisma migrate`/`db:seed` (`DIRECT_URL` — novo campo
  `directUrl` no datasource do `schema.prisma`).
- **Migrations**: workflow dedicado (`.github/workflows/db-migrate.yml`)
  roda `prisma migrate deploy` no projeto Supabase certo conforme a branch
  que recebeu o push, via secrets `STAGE_DIRECT_URL`/`PROD_DIRECT_URL`.
- **Backup**: backup automático + PITR do Supabase, substitui o `pg_dump`
  agendado que `plano/15` previa.
- `Dockerfile`/`docker-compose.yml` continuam existindo e sendo a forma de
  rodar o projeto **localmente** (dev) — deixam de ser "a mesma imagem em
  todo ambiente", que era a promessa central do ADR-0007.

## Consequências
- Positivas: zero manutenção de infra (TLS, patch de SO, backup, scaling
  ficam com a plataforma); deploy automático por push; adequado ao contexto
  acadêmico sem equipe de operação.
- Negativas: perde a portabilidade multi-alvo do ADR-0007 — trocar de
  Vercel/Supabase no futuro exige trabalho de migração, não é mais "trocar
  o passo final do workflow". Lock-in de plataforma aceito conscientemente.
- `ponytail:` teto = plano gratuito/baixo custo da Vercel+Supabase; upgrade
  = revisitar alvo self-hosted se custo ou requisito de soberania de dado
  (ex.: exigência de hospedagem em infra própria do SUS/CER) tornar a
  plataforma gerenciada inviável.
