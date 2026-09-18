# Documentação — PTS Digital

Guia operacional do repositório: como subir, configurar, testar e versionar. Documentação de planejamento e ADRs ficam em [`pts-context-docs/`](pts-context-docs/README.md).

## Índice

| Doc | Conteúdo |
|---|---|
| [01-pre-requisitos.md](01-pre-requisitos.md) | Tecnologias, versões e instalação |
| [02-docker-compose.md](02-docker-compose.md) | Como subir o ambiente (app + postgres + mailhog) |
| [03-configuracao.md](03-configuracao.md) | Variáveis de ambiente, Prisma, Tailwind/shadcn, scripts |
| [04-commit-versionamento.md](04-commit-versionamento.md) | Conventional Commits, branches, PR, versionamento |
| [05-ci-cd-deploy.md](05-ci-cd-deploy.md) | Pipeline GitHub Actions e deploy |

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Runtime | Node 22 LTS (Docker) |
| Linguagem | TypeScript strict |
| ORM | Prisma |
| Banco | PostgreSQL 16 (`pgcrypto`, `citext`) |
| UI | Tailwind CSS + shadcn/ui |
| Testes | Vitest (unit) + Playwright (e2e) |
| CI | GitHub Actions |
| Deploy | Vercel (app) + Supabase (banco) — ver [05-ci-cd-deploy.md](05-ci-cd-deploy.md) |

Decisões de arquitetura: `pts-context-docs/docs/adr/0001–0011` (link acima).
