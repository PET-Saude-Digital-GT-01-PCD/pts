# Configuração

## Variáveis de ambiente

Copie o exemplo e ajuste:

```bash
cp .env.example .env
```

| Variável | Descrição | Padrão dev |
|---|---|---|
| `DATABASE_URL` | connection string do PostgreSQL (pooler de transação em stage/prod — Supabase, porta 6543) | `postgresql://pts:pts@localhost:5432/pts?schema=public` |
| `DIRECT_URL` | conexão direta ao Postgres, usada só por `prisma migrate`/`db:seed` (porta 5432; em stage/prod é a Session pooler/direct do Supabase) | igual a `DATABASE_URL` |
| `AUTH_SECRET` | segredo de assinatura do JWT (Auth.js) — gerar com `openssl rand -base64 32` | — |
| `AUTH_URL` | URL pública da aplicação (Auth.js) | `http://localhost:3000` |
| `SEED_ADMIN_SENHA` | senha do usuário `admin@pts.local` no seed | `admin123` (obrigatória e diferente do padrão quando `SEED_DEMO` não é `true`) |
| `SEED_DEMO` | `true` cria usuários/pacientes/PTS de exemplo (dev/stage/CI); ausente/qualquer outro valor = só bootstrap (RBAC + 1 admin) — **não definir em produção** | `true` |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_FROM` | notificação por e-mail à eSF (issue #64); em dev aponta pro MailHog do compose | `localhost` / `1025` / `pts@local.test` |
| `NOTIFY_ESF_EMAIL` | e-mail que recebe notificação de PTS aberto; sem valor, envio é pulado silenciosamente | — |

> Dentro do compose (`app`), `DATABASE_URL`/`DIRECT_URL` apontam para o host `db`. No host, apontam para `localhost`. O `.env` não é versionado (`.gitignore`); o `.env.example` é a fonte de verdade para novas variáveis. `AUTH_SECRET` é obrigatório em produção/CI (o build falha sem ele). Setup completo de stage/prod (Supabase + Vercel): [`05-ci-cd-deploy.md`](05-ci-cd-deploy.md).

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
- pnpm ≥10 bloqueia build scripts por padrão (`prisma generate` no `postinstall` não rodaria sozinho) — já liberado em `pnpm-workspace.yaml` (`allowBuilds`).

## Tailwind CSS + shadcn/ui

- Tailwind v4, configurado via `@import "tailwindcss"` em `src/app/globals.css` (CSS-first, sem `tailwind.config.js`).
- Componentes shadcn em `src/components/ui/` (Radix). Adicionar novos:

```bash
pnpm dlx shadcn@latest add <componente>
```

- Convenção: alias `@/*` → `src/*`; utilitário `cn` (clsx + tailwind-merge) em `src/lib/utils.ts`.

## Fontes

Build roda sem rede: **não** usar `next/font/google` (faz fetch na build). Usar font stack do sistema (já configurado).

## Tema (claro/escuro)

- Tema por classe `.dark` (não `prefers-color-scheme`) via **next-themes** — tokens em `src/app/globals.css` (oklch, claro + dark) com paleta da identidade PET/CER.
- Toggle no header (`src/components/ui/theme-toggle.tsx`): Claro / Escuro / Sistema.
- Adicionar `@custom-variant dark` já está no `globals.css` — necessário para `dark:` de classe no Tailwind v4.
- Novas telas: usar tokens (`bg-card`, `text-muted-foreground`, `text-success`, etc.) em vez de cores hardcoded.

## Docker

- `Dockerfile` multi-stage (`deps` → `builder` → `runner`); imagem de produção roda como usuário não-root.
- Dev usa `docker compose up` (documentação em `02-docker-compose.md`).
