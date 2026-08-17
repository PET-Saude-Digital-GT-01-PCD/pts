# PTS Digital

Plataforma de gestão do **Projeto Terapêutico Singular (PTS)** para **Centros Especializados em Reabilitação (CER)** do SUS.

Conduz a Pessoa com Deficiência (PCD) por toda a jornada do cuidado — recepção, triagem, avaliação (SOAP), avaliações multiprofissionais, pactuação de metas, acompanhamento e contrarreferência — com integração ao e-SUS PEC e materialização da cogestão do cuidado.

## Stack

Next.js 15 · TypeScript strict · Tailwind CSS + shadcn/ui · PostgreSQL 16 · Prisma · Docker · Vitest · Playwright · GitHub Actions.

## Começando

Pré-requisitos: Docker + Compose, Node 22 LTS, pnpm ≥ 10 ([detalhes](docs/01-pre-requisitos.md)).

```bash
cp .env.example .env     # primeira vez
docker compose up        # app :3000 · db :5432 · mailhog :8025
```

Mais opções de setup (app no host, banco só) em [docs/02-docker-compose.md](docs/02-docker-compose.md).

## Estrutura

```
src/app/          rotas/screens (server components, server actions)
src/components/   shadcn/ui + componentes de UI
src/server/       bounded contexts (nascem com as features)
src/lib/          db (PrismaClient), utils
prisma/           schema, migrations, seed
tests/            unit (Vitest)
e2e/              Playwright
docs/             guia operacional (setup, docker, config, commit)
pts-context-docs/ planejamento completo (base, plano 00–17, ADRs 0001–0010)
```

## Documentação

- **Operacional** (subir, configurar, commit, CI/CD): [`docs/`](docs/README.md)
- **Domínio e linguagem ubíqua**: [`CONTEXT.md`](CONTEXT.md)
- **Planejamento e ADRs**: [`pts-context-docs/`](pts-context-docs/README.md)

## Comandos

| Ação | Comando |
|---|---|
| Dev (docker) | `docker compose up` |
| Dev (app no host) | `docker compose up db mailhog` + `pnpm dev` |
| Typecheck / Lint | `pnpm typecheck` · `pnpm lint` |
| Testes | `pnpm test` · `pnpm e2e` |
| Migration dev | `pnpm db:migrate` |
| Aplicar migrations | `pnpm db:deploy` |
| Seed | `pnpm db:seed` |
