# Configuração

## Variáveis de ambiente

Copie o exemplo e ajuste:

```bash
cp .env.example .env
```

| Variável | Descrição | Padrão dev |
|---|---|---|
| `DATABASE_URL` | connection string do PostgreSQL | `postgresql://pts:pts@localhost:5432/pts?schema=public` |
| `AUTH_SECRET` | segredo de assinatura do JWT (Auth.js) — gerar com `openssl rand -base64 32` | — |
| `AUTH_URL` | URL pública da aplicação (Auth.js) | `http://localhost:3000` |
| `SEED_ADMIN_SENHA` | senha do usuário `admin@pts.local` no seed (dev) | `admin123` |

> Dentro do compose (`app`), `DATABASE_URL` aponta para o host `db` (`postgresql://pts:pts@db:5432/pts`). No host, aponta para `localhost`. O `.env` não é versionado (`.gitignore`); o `.env.example` é a fonte de verdade para novas variáveis. `AUTH_SECRET` é obrigatório em produção/CI (o build falha sem ele).

## Scripts

| Script | Comando | Efeito |
|---|---|---|
| Dev | `pnpm dev` | Next.js com hot reload |
| Build | `pnpm build` | build de produção (output `standalone`) |
| Start | `pnpm start` | roda o build |
| Lint | `pnpm lint` | ESLint |
| Typecheck | `pnpm typecheck` | `tsc --noEmit` |
| Test | `pnpm test` / `pnpm test:watch` | Vitest |
| E2E | `pnpm e2e` | Playwright (sobe build local) |
| `db:generate` | `pnpm db:generate` | gera Prisma Client |
| `db:migrate` | `pnpm db:migrate` | cria e aplica migration (dev) |
| `db:deploy` | `pnpm db:deploy` | aplica migrations pendentes |
| `db:seed` | `pnpm db:seed` | popula dados de dev |
| `db:studio` | `pnpm db:studio` | Prisma Studio |

## Prisma

```bash
pnpm db:migrate --name <descricao>   # dev: cria migration + aplica
pnpm db:deploy                       # ambientes: aplica sem criar
pnpm db:seed                         # CER piloto + usuário admin
```

Regras:

- Em dev, sempre `prisma migrate dev` (nunca auto-apply em produção).
- Em produção/CI, `prisma migrate deploy` antes de subir o app.
- Extensões `pgcrypto` (uuid) e `citext` (email/CPF case-insensitive) são criadas pela própria migration.

## Tailwind CSS + shadcn/ui

- Tailwind v4, configurado via `@import "tailwindcss"` em `src/app/globals.css` (CSS-first, sem `tailwind.config.js`).
- Componentes shadcn em `src/components/ui/` (Radix). Adicionar novos:

```bash
pnpm dlx shadcn@latest add <componente>
```

- Convenção: alias `@/*` → `src/*`; utilitário `cn` (clsx + tailwind-merge) em `src/lib/utils.ts`.

## Fontes

Build roda sem rede: **não** usar `next/font/google` (faz fetch na build). Usar font stack do sistema (já configurado).

## Docker

- `Dockerfile` multi-stage (`deps` → `builder` → `runner`); imagem de produção roda como usuário não-root.
- Dev usa `docker compose up` (documentação em `02-docker-compose.md`).
