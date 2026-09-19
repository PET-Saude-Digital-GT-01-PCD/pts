# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).
Versionamento: [SemVer](https://semver.org) — ver `docs/04-commit-versionamento.md`
(durante o MVP/piloto, permanece em `0.x.y`).

Entradas anteriores a este arquivo foram reconstruídas a partir do histórico
de merges (`git log`), agrupadas por marco — não é um changelog granular por
commit desde o início do projeto.

## [Não lançado]

### Adicionado
- Tela "Fluxo do cuidado" (`/dashboard/fluxo`): trilha interativa da recepção
  ao encerramento, com contagem por etapa, quem atua, permissões RBAC exigidas
  e transições vindas da máquina de status.

### Corrigido
- Deploy Vercel + Supabase quebrava com "Application error: a server-side
  exception has occurred": o workflow `db-migrate` falhava em toda execução
  por secret ausente (`PROD_DIRECT_URL`/`STAGE_DIRECT_URL`), as migrations
  nunca chegavam ao Supabase e toda página caía na primeira query.
- Painel do caso: o `Suspense` por aba fazia o conteúdo streamado conviver por
  instantes com a cópia já montada, duplicando `id`s, controles de formulário e
  landmarks no DOM — removido o boundary por aba.
- Nova meta, mudança de status de meta e comentário no mural passam a
  `revalidatePath` da página do caso; antes o item só aparecia após recarregar.
- E2E realinhados às refatorações de UI: rótulo "Descrição acessível", link
  "Abrir portal do cidadão" e negativa de permissão caindo em `/dashboard`
  (sessão ativa não volta mais para a landing).

### Alterado
- `db-migrate` confere o secret antes de rodar e falha dizendo qual falta;
  ganha `workflow_dispatch` (execução sob demanda) com seed de bootstrap
  opcional, necessário na primeira subida de um banco vazio.
- `/api/health` consulta uma tabela real (não `SELECT 1`, que passa em banco
  vazio) e informa a causa da falha — env var ausente, host inalcançável,
  schema não aplicado ou credenciais recusadas.
- Leitura pública de branding (`buscarOrgConfigView`) degrada para o padrão
  quando o banco está fora do ar, em vez de derrubar landing e `/login`, que
  não dependem de banco.
- Reestruturação das telas de admin (visão geral, usuários, papéis, equipes,
  identidade visual, indicadores e auditoria) sobre uma moldura comum
  (`AdminShell`) com abas da área filtradas por RBAC, cartões de indicador e
  painéis de conteúdo.
- Design tokens mais arredondados e suaves: `--radius` de 0.625rem para
  0.875rem, novos raios `2xl`/`3xl`, superfícies (`--surface`,
  `--surface-raised`, `--surface-sunken`) e sombras (`--shadow-soft`,
  `--shadow-raised`). Paleta de marca mantida.
- Migração do alvo de deploy: Docker-first/alvo plugável (ADR-0007) →
  Vercel + Supabase (ADR-0011).
- Componentização de UI: extração de lógica de página/formulários grandes em
  componentes satélite, novos primitivos shadcn (`Table`, `Dialog`,
  `AlertDialog`, `Select`, `Textarea`) — ver `plano/18`.
- Auditoria e correção de consistência da documentação (ADRs, `plano/`,
  `docs/`, `plano-execucao/`) — este commit.

## [0.1.0] — Fase 1 MVP + Fase 2 (RBAC, governança, portal cidadão)

### Adicionado
- Núcleo do MVP: recepção (cadastro, cuidador/Zarit, consentimento,
  baseline), triagem (semáforo, elegibilidade), SOAP + divergência saudável,
  avaliações CIF (Fisio/TO), cogestão (metas, mural).
- Ciclo de vida do PTS: transições de status, encerramento, reavaliação e
  versionamento com comparativo (#59, #70).
- Eventos de cuidado e semáforo de reunião com gatilho automático (#60, #61).
- Fila outbound persistida em PostgreSQL, sem Redis (ADR-0006); notificação
  por e-mail à eSF (#63, #64).
- Contrarreferência — guia e plano à APS (#62).
- Validação de PPI por município + cadastro provisório com alerta (#65).
- Escalas clínicas Ashworth e Glasgow no SOAP (#66).
- Fila de espera amarela com tempo estimado (#67).
- RBAC configurável por papel (ADR-0009): admissão/auto-cadastro com
  aprovação (#15), branding por organização via `org_config` (ADR-0010,
  #68), equipe do caso com enforcement por vínculo (#69).
- Governança (M6): viewer da trilha de auditoria e painel de indicadores de
  produção/qualidade (#71, #72).
- Portal do cidadão com percurso e metas em linguagem acessível, escopo
  reduzido (#73).
- Integração e-SUS por portas + adapters multi-formato (ADR-0008), mock
  ativo.

### Corrigido
- Achados de auditoria interna pós-execução noturna (#53–#58).

## [0.0.1] — Scaffolding

### Adicionado
- Base Next.js 15 (App Router) + TypeScript strict + Tailwind/shadcn +
  PostgreSQL 16 + Prisma, Docker multi-stage, CI (GitHub Actions).
- Schema Prisma núcleo da Fase 1 + migration + seed inicial.
