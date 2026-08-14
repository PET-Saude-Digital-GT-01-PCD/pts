# Docker Compose

Ambiente de desenvolvimento completo via Docker. Três serviços:

| Serviço | Imagem | Porta | Papel |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `5432` | banco de dados (volume `pts_pgdata`) |
| `mailhog` | `mailhog/mailhog` | `1025` (SMTP) · `8025` (UI) | captura de e-mails de notificação |
| `app` | build do `Dockerfile` (target `deps`) | `3000` | Next.js em modo dev (hot reload) |

## Subir

```bash
docker compose up            # app + db + mailhog (log acompanhado)
docker compose up -d         # em background
```

O app sobe assim que o `db` estiver saudável (`pg_isready`). Na primeira subida o compose instala dependências e aplica migrations (`prisma migrate deploy`), depois inicia o `next dev` com hot reload.

Acessos:

- App: http://localhost:3000
- Healthcheck: http://localhost:3000/api/health (retorna `{"status":"ok","db":"up"}`)
- MailHog UI: http://localhost:8025
- Banco: `postgresql://pts:pts@localhost:5432/pts`

## Só o banco (app no host)

Prefere rodar o app no host (mais rápido, depurador mais fácil):

```bash
docker compose up db mailhog
pnpm install
cp .env.example .env          # primeira vez
pnpm dev                      # app em http://localhost:3000
```

## Comandos úteis

| Comando | Efeito |
|---|---|
| `docker compose logs -f app` | acompanhar logs do app |
| `docker compose ps` | status dos serviços |
| `docker compose restart app` | reiniciar app |
| `docker compose down` | parar serviços (mantém dados) |
| `docker compose down -v` | parar **e apagar** o volume do banco (perde dados) |
| `docker compose up -d --build app` | reconstruir imagem do app |

## Troubleshooting

- **App reinicia em loop antes de "compiled"**: o banco pode ter demorado; conferir `docker compose ps` e `docker compose logs db`.
- **Porta 5432 ocupada**: outro postgres local rodando. Parar o serviço ou trocar a porta no `docker-compose.yml` (ex.: `"5433:5432"`).
- **`PrismaClientInitializationError` no app**: rodar `docker compose restart app` (client gerado no boot).
- **Perdeu o banco por engano**: `docker compose up -d db` + `pnpm prisma migrate dev` + `pnpm db:seed`.
