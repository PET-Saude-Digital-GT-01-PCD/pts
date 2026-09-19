# CI/CD e Deploy

## Pipeline — GitHub Actions

### `ci.yml` (obrigatório em PR e main)

```
checkout → pnpm install (cache) → typecheck → lint → vitest
  → prisma generate + migrate + seed (service postgres:16) → build → playwright e2e
```

- **Gate:** CI falhou → sem merge, sem deploy.
- Banco de teste: serviço `postgres:16` do próprio workflow.
- Cache: pnpm store (via `pnpm/action-setup` + `setup-node`).
- O e2e de login depende do seed: o workflow roda `db:seed` após migrate e injeta `AUTH_SECRET`, `AUTH_URL` e `SEED_ADMIN_SENHA` (valores só de CI).

### `db-migrate.yml` (push em `main` / `develop`)

`prisma migrate deploy` no Supabase certo conforme a branch:

| Branch  | Projeto Supabase | Secret (connection string direct / 5432) |
|---------|------------------|------------------------------------------|
| develop | `pts-stage`      | `STAGE_DIRECT_URL`                        |
| main    | `pts-production`  | `PROD_DIRECT_URL`                         |

O deploy da aplicação em si é da Vercel (Git integration), não de workflow.

Também roda sob demanda: **Actions → db-migrate → Run workflow**, na branch do
ambiente. O input `seed` roda o seed de bootstrap (RBAC + admin) depois do
migrate — necessário na primeira subida de um banco vazio, e exige o secret
`SEED_ADMIN_SENHA`. O seed é idempotente, então repetir não quebra nada.

Sem o secret da branch o job falha logo no primeiro passo dizendo qual secret
falta. **Enquanto ele falha, as migrations não chegam ao Supabase** e o app na
Vercel sobe com um banco vazio — ver Troubleshooting.

## Secrets

- Secrets de ambiente ficam em GitHub Actions (`Settings → Secrets`), nunca no repo.
- `.env*` está no `.gitignore`; exemplos em `.env.example`.

## Imagem Docker

- `Dockerfile` multi-stage: `deps` (pnpm install) → `builder` (prisma generate + build) → `runner` (Node 22 slim, **non-root**, standalone output).
- A mesma imagem serve dev, staging e prod — só varia configuração (env).
- Migrations não auto-aplicam em dev; produção roda `prisma migrate deploy` antes de subir o app.

## Ambientes

| Ambiente | App | Banco |
|---|---|---|
| local | `docker compose up` / `pnpm dev` | Postgres 16 no compose |
| stage | Vercel **Preview** (branch `develop`) | Supabase `pts-stage` |
| prod  | Vercel **Production** (branch `main`) | Supabase `pts-production` |

`DATABASE_URL` = Supabase Transaction pooler (6543, `?pgbouncer=true&connection_limit=1`);
`DIRECT_URL` = Session pooler / direct (5432), usada só por `prisma migrate`/`db:seed`.
`prisma generate` roda no `postinstall` (build da Vercel).

### Setup por projeto Supabase (uma vez, para `pts-stage` e `pts-production`)

1. Copiar as duas connection strings (Project Settings → Database).
2. Aplicar schema localmente com as URLs exportadas: `pnpm prisma migrate deploy`.
   Se falhar em `CREATE EXTENSION`: habilitar `pgcrypto` e `citext` em
   Database → Extensions e repetir.
3. Seed:
   - stage: `SEED_DEMO=true pnpm db:seed`
   - prod: `SEED_ADMIN_SENHA='<forte>' pnpm db:seed` (sem `SEED_DEMO` → só bootstrap).
4. Vercel → Environment Variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`
   (`openssl rand -base64 33`), `AUTH_URL` — em `Production` (pts-production) e
   `Preview` (pts-stage). **Não** definir `SEED_DEMO` em Production.
5. GitHub → repo Secrets: `PROD_DIRECT_URL`, `STAGE_DIRECT_URL`.

## Troubleshooting

### "Application error: a server-side exception has occurred"

Erro genérico do Next: alguma rota lançou no servidor. Na prática, no deploy
Vercel + Supabase são sempre um destes três, e o healthcheck distingue:

```
curl -s https://<app>.vercel.app/api/health
```

| Resposta | Causa | Correção |
|---|---|---|
| `{"status":"ok","db":"up"}` | banco ok | o erro é outro; ver Vercel → Logs |
| `causa: "DATABASE_URL não definida..."` | env var faltando na Vercel | Vercel → Settings → Environment Variables, e **redeploy** (env var nova não vale para deploy já feito) |
| `causa: "schema não aplicado..."` | migrations nunca aplicadas | rodar `db-migrate` (ver acima) |
| `causa: "banco inalcançável..."` | endereço errado | usar o **pooler** do Supabase, não a direct connection: as funções da Vercel não saem por IPv6 |
| `causa: "credenciais recusadas"` | senha errada na connection string | recopiar do Supabase |

O healthcheck consulta uma tabela real de propósito: `SELECT 1` passa num banco
vazio, que é justamente o caso em que toda página quebra.

### Login não aceita ninguém, mas o app abre

Banco migrado sem seed: não há CER, papéis nem admin. Rodar `db-migrate` com
`seed: true`.

## Segurança (resumo)

- TLS obrigatório em produção.
- `pgcrypto` para campos sensíveis; dados clínicos só dentro do PTS (FK `RESTRICT`).
- Auditoria append-only na mesma transação; lock otimista (`version`) → conflito = 409.
- Backup: backup automático / PITR do Supabase (substitui o `pg_dump` agendado do `plano/15`).

## Dependências fixadas em pré-release

| Pacote | Versão | Por quê | Reavaliar quando |
|---|---|---|---|
| `next-auth` | `5.0.0-beta.32` (exata, sem `^`) | Em 2026-09-19 a v5 não tem GA: `beta.32` (jul/2026) é o último release da linha 5.x e a tag `latest` ainda é `4.24.x`. Voltar para a v4 perde o que o repo usa da v5 (`auth()` no App Router, `authConfig` compartilhado com o middleware, callbacks `jwt`/`session` com `trigger: "update"` na simulação de perfil). | Sair `5.0.0` estável. Aí: bump, ler as notas de breaking change de sessão/JWT e rodar `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`. |

Conferir com `npm view next-auth dist-tags`. Bump entre betas vem pelo Dependabot, e cada um precisa passar na suíte e2e de login/admissão antes do merge.

## Dependências transitivas com alerta (triagem 2026-09-19, #120)

Bumps de rotina vêm pelo Dependabot (`.github/dependabot.yml`, semanal, para `develop`). Correção fora do range que o pai pede fica em `overrides` no `pnpm-workspace.yaml`, sempre na mesma major. Cada linha sai quando o pai passar a pedir a versão corrigida.

| Pacote | Vem de | Decisão |
|---|---|---|
| `sharp` (2 high) | `next` (otimização de imagem) | override `^0.35.4`, dentro do range que o `next@15.5.25` aceita |
| `postcss` (2 high, 2 moderate) | `next` pina `8.4.31` | override `^8.5.23` (mesma major; build verificado) |
| `fast-uri` (4 high), `hono` (3 moderate), `qs` (2 moderate) | CLI `shadcn` → `@modelcontextprotocol/sdk` | `shadcn` movido para `devDependencies` (é só CLI, o app não importa) + overrides na mesma major |
| `js-yaml` (1 high) | `eslint` (dev) | override `^4.3.2` |
| `vitest`/`@vitest/mocker` (3 moderate) | dependência direta (dev) | bump `^3` → `^4.1.11` |
| `deepmerge-ts` (1 high) | `prisma` → `@prisma/config` | **risco aceito**: a correção é major (8.x) e nem o `@prisma/config` mais recente a usa. Só afeta merge de objeto recursivo no carregamento de config do Prisma, que não recebe entrada de usuário. Reavaliar no próximo bump do Prisma. |
