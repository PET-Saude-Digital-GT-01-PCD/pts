# Pré-requisitos

Tecnologias necessárias para rodar o projeto localmente.

## Obrigatório

| Ferramenta | Versão | Uso |
|---|---|---|
| [Git](https://git-scm.com/downloads) | ≥ 2.40 | versionamento |
| [Docker](https://docs.docker.com/engine/install/) + Docker Compose plugin | Docker ≥ 26 · Compose ≥ 2.24 | postgres, mailhog e app |
| [pnpm](https://pnpm.io/installation) | ≥ 10 | gerenciador de pacotes |
| Node.js | 22 LTS | runtime (usado pelo app no host e pelos scripts Prisma) |

### Instalação rápida

- **Linux (Debian/Ubuntu):** instalar Docker via [repositório oficial](https://docs.docker.com/engine/install/debian/); habilitar o plugin compose; instalar Node 22 com [nvm](https://github.com/nvm-sh/nvm) (`nvm install 22`), depois `corepack enable && corepack prepare pnpm@latest --activate`.
- **macOS:** Docker Desktop (inclui compose) + nvm.
- **Windows:** Docker Desktop com WSL2 + nvm-windows.

Verifique:

```bash
git --version
docker --version
docker compose version
node --version   # v22.x
pnpm --version   # 10.x ou 11.x
```

> O repositório declara `.nvmrc` (Node 22) e `packageManager` no `package.json`. O `nvm`/`corepack` respeitam automaticamente.

## Opcional

| Ferramenta | Uso |
|---|---|
| [MailHog UI](http://localhost:8025) | vem no compose (sem instalação) |
| Prisma Studio | `pnpm db:studio` |

## Verificação rápida do ambiente

```bash
docker compose up -d db      # sobe só o postgres
pnpm install                 # baixa dependências
pnpm typecheck && pnpm lint && pnpm test
```

Se tudo passar, o ambiente está pronto. Próximo passo: [`02-docker-compose.md`](02-docker-compose.md).
