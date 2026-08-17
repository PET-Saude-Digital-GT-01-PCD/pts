# AGENTS.md — PTS Digital

Instruções operacionais para agentes que trabalham neste repositório. Instrução de trabalho, não documentação de produto (domínio em `CONTEXT.md`, setup/guia em `docs/`).

## Estado atual

- **Fase:** base de desenvolvimento pronta. Next.js 15 · TypeScript strict · Tailwind + shadcn/ui · PostgreSQL 16 · Prisma · Docker-first · Vitest · Playwright · GitHub Actions.
- Contexto do produto (planejamento completo, ADRs 0001–0010): `pts-context-docs/`. Respeite ADRs; não reabra decisão registrada. RBAC configurável + admissão + multi-instância: `plano/17`.
- Fluxo de engenharia oficial: **Superpowers** (`plano/16`). Fluxos do Matt Pocock não misturar.

## Comandos

- Dev (tudo em container): `docker compose up` → app em `http://localhost:3000`, MailHog em `:8025`
- Dev (só app no host, banco em container): `docker compose up db mailhog` + `pnpm dev`
- Migrações: `pnpm db:migrate` (dev, cria migration) / `pnpm db:deploy` (aplica) / `pnpm db:seed` (seed dev)
- Typecheck: `pnpm typecheck` · Lint: `pnpm lint`
- Testes: `pnpm test` (Vitest) · `pnpm e2e` (Playwright, sobe build local)
- CI: GitHub Actions — `ci.yml` (PR + main)

## Estrutura

```
src/
├── app/                 # rotas/screens (server components, server actions)
│   ├── api/health/      #   healthcheck L7 (app + DB)
├── components/          # shadcn/ui + componentes de UI
│   └── ui/              #   primitivos gerados pelo shadcn
├── server/              # regras de negócio (bounded contexts)
│   ├── care-plan/       #   NÚCLEO: pts, metas, revisões, mural, eventos
│   ├── reception/       #   paciente, cuidador, consentimento, baseline, PPI
│   ├── triage/          #   semáforo, elegibilidade, contrarreferência
│   ├── clinical/        #   SOAP, avaliações por especialidade
│   ├── governance/      #   indicadores, auditoria
│   ├── iam/             #   usuários, papéis/permissões (RBAC dinâmico), admissão; senha/sessão (ativo)
│   ├── integrations/    #   e-SUS (FHIR), notify, fila outbound
│   └── shared/          #   zod, auditoria, lock otimista, tipos
├── lib/                 # db (PrismaClient), auth (Auth.js), utils
prisma/                  # schema, migrations, seed
tests/                   # unit (Vitest)
e2e/                     # Playwright
```

Regra de dependência: `app → server/{contexto} → prisma`. `shared` não importa contexto nenhum. Contextos nascem com as features (não criar pastas vazias).

## Regras de trabalho

- Dado clínico só existe dentro de um PTS (nada órfão) — FK `RESTRICT`.
- Toda mutação crítica (classificação, meta, encerramento, consentimento) grava auditoria na mesma transação.
- Auditoria é **append-only** — nunca update/delete.
- Lock otimista (`version`) em rows mutáveis; conflito → 409 → recarrega UI.
- e-SUS é periférico: contrato por interface + mock. Fluxo clínico nunca trava por indisponibilidade de integração.
- Semáforo e elegibilidade são funções puras determinísticas — TDD obrigatório.
- Acesso controlado por RBAC data-driven: `requirePermissao("grupo.recurso")` (não `requirePapel`). Guardrails (GESTOR sem recurso clínico, admin.* só base ADMIN, ≥1 admin ativo, papel em uso não deleta) em `server/iam/permissoes.ts`, TDD obrigatório.
- Mudança de papel/permissão grava auditoria na mesma transação.
- `ponytail:` comentários marcam simplificação deliberada (nome do teto + caminho de upgrade).
- Não commitar secrets; `.env` no `.gitignore`, exemplos em `.env.example`.
- Fontes: usar font stack do sistema (sem `next/font/google` — build precisa rodar sem rede).
- Rodar `pnpm typecheck && pnpm lint && pnpm test` antes de concluir tarefa.

## Vocabulário (resumo)

PTS, CER, PCD, semáforo (Verde/Amarelo/Vermelho), pactuação SMART, cogestão, linha de base, contrarreferência. Termos completos em `CONTEXT.md`.

## Armadilhas conhecidas

- `CLAUDE.md` não é lido pelo OpenCode — sincronizar com `AGENTS.md` (duplicar conteúdo).
- pnpm ≥10: build scripts bloqueados por padrão; liberar em `pnpm-workspace.yaml` (`allowBuilds`).
- Skills do Superpowers podem não estar ativas na sessão — verificar registro no `opencode.jsonc`.
- Não misturar fluxos de engenharia (Superpowers vs Matt Pocock) — escolher um e ser consistente.
- Citações literais de normas (Portaria 793/2012, LGPD, CFM 1.821/2007) requerem verificação em fonte primária antes de publicação formal.
- `next build` faz fetch de Google Fonts se usado `next/font/google` — proibido; usar font stack local.
