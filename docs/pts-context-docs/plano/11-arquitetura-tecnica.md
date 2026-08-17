# 11 — Arquitetura Técnica

> **Input:** docs `05`, `06`, `07`, `Perguntas/01–06` · **Decisões:** `docs/adr/0001`–`0007` · **Nível:** arquitetura técnica (stack, camadas, contexts, integrações)

## 1. Stack final

| Camada | Escolha | Justificativa |
|---|---|---|
| Framework | Next.js 15 (App Router) | Monólito; Server Components + Server Actions; sem app separado |
| Runtime | Node 22 LTS (Docker) | Máxima compatibilidade de tooling; alinhado ao ecossistema Prisma/Next |
| Linguagem | TypeScript strict | Dado de saúde exige type safety nas fronteiras |
| ORM | Prisma | Migrations + types + enums; DX para time acadêmico |
| Validação | Zod | Schemas compartilhados UI↔servidor; valida payloads JSONB |
| Autenticação | Auth.js v5 (credentials) + RBAC configurável | Gov.br entra como provider OIDC; papéis/permissões data-driven (ADR-0009) |
| UI | Tailwind + shadcn/ui (Radix) | Componentes acessíveis (WCAG/LBI); velocidade de montagem |
| Banco | PostgreSQL 16 (Docker; `pgcrypto`, `citext`) | Criptografia em repouso; CPF/CNS case-insensitive |
| Testes | Vitest (unit) + Playwright (e2e) | Um framework unit + um e2e, nada mais |
| CI/CD | GitHub Actions | `ci.yml`, `deploy-staging.yml`, `deploy-prod.yml` |
| Deploy | Docker-first: imagem portável + compose | Alvo (VPS/plataforma) decidido na Fase 2; imagem não muda |
| Fila outbound | Tabela PG + `FOR UPDATE SKIP LOCKED` | Sem Redis; volume de piloto não justifica infra nova |

Não é isto: **não** é monorepo (um app só), **não** é CQRS/event-sourcing/Redis (simplificações marcadas `ponytail:` onde aplicável), **não** substitui infraestrutura do SUS (e-SUS é periférico).

## 2. Princípios de arquitetura (herdados do doc 06)

1. **O PTS é o agregador** — nenhum dado clínico existe fora de um contexto de PTS (FK `RESTRICT`).
2. **Complementar ao e-SUS, nunca substituto** — contrato por interface + mock; fluxo clínico nunca trava por indisponibilidade de integração.
3. **Resiliência primeiro** — recepção degrada para cadastro provisório; escrita externa passa por fila.
4. **Dados de saúde são sensíveis** — mínimos, retrospetáveis, auditáveis, com consentimento.
5. **Interfaces por papel e contexto** — menor privilégio (doc `Perguntas/03`).

## 3. Arquitetura em camadas

**Monólito modular** — pastas = bounded contexts, comunicação por funções (sem HTTP interno).

```
src/
├── app/                    # rotas/screens (server components, server actions)
│   ├── login/
│   ├── dashboard/
│   ├── recepcao/
│   ├── casos/[ptsId]/      # painel PTS (timeline + metas + mural)
│   ├── metas/              # painel de metas cruzadas
│   ├── governanca/
│   └── portal/             # portal cidadão
├── server/                 # regras de negócio (bounded contexts)
│   ├── care-plan/          # NÚCLEO: pts, metas, revisões, mural, eventos
│   ├── reception/          # paciente, cuidador, consentimento, baseline, PPI
│   ├── triage/             # semáforo, elegibilidade, contrarreferência
│   ├── clinical/           # SOAP, avaliações por especialidade
│   ├── governance/         # indicadores, auditoria
│   ├── iam/                # usuários, papéis, acesso por caso
│   ├── integrations/       # esus (FHIR), ppi, notify, fila outbound
│   └── shared/             # zod, auditoria, lock otimista, tipos
├── lib/                    # db (prisma client), auth (session), logger
prisma/
tests/                      # unit (Vitest)
e2e/                        # Playwright
docker-compose.yml  Dockerfile  .github/workflows/
```

**Regra de dependência:** `app → server/{contexto} → prisma`. `shared` não importa contexto nenhum. Contexto não importa outro contexto diretamente (comunicação via `shared` contratos ou orquestração em `app`).

### Fluxo de escrita

```
Server Action → zod valida input → usecase do contexto
  → transação Prisma (dado + auditoria + bump version)
  → revalidação UI (router.refresh / revalidatePath)
```

### Fluxo de leitura

```
Server Component → query repository do contexto → render
```

Autorização: checagem de papel + permissão de recurso (`iam`, RBAC data-driven — ADR-0009) + vinculação ao caso antes de qualquer usecase de escrita; leitura clínica restrita à equipe do PTS. Admissão por auto-cadastro com aprovação do admin (`usuario.status` PENDENTE/ATIVO/BLOQUEADO). Identidade da org (nome, logo, parceiros) via `org_config` no layout (ADR-0010).

## 4. Bounded contexts (núcleo)

| Contexto | Módulos de negócio | Estabilidade |
|---|---|---|
| `care-plan` | PTS, metas, revisões, mural, eventos | **NÚCLEO — dificilmente muda** |
| `reception` | paciente, cuidador, consentimento, baseline, PPI | Núcleo do fluxo de entrada |
| `triage` | semáforo, elegibilidade, contrarreferência | Núcleo; regras determinísticas |
| `clinical` | SOAP, avaliações por especialidade | Estável; payloads JSONB evoluem |
| `governance` | indicadores, auditoria (leitura) | Evolutivo (Fase 2) |
| `iam` | usuários, papéis, permissões, admissão, acesso por caso | Estável; RBAC data-driven (ADR-0009) |
| `integrations` | e-SUS (FHIR), notify, fila outbound | **Evolutivo — mock primeiro** |

Prioridade de construção (Fase 1): `care-plan` + `iam` + `reception` + `triage` + `clinical` (fisio/TO). `governance` completo e `integrations` reais na Fase 2.

## 5. Integrações externas

| Integração | Direção | Uso | Contingência |
|---|---|---|---|
| **e-SUS PEC (API FHIR)** | Leitura | Linha de base (M1), elegibilidade (M2) | Mock em dev; degradação p/ cadastro provisório com flag `origem=digitado` |
| **e-SUS PEC (escrita)** | Escrita | Marcador PTS, guia de contrarreferência | `outbound_queue` + reenvio + confirmação |
| **Gov.br** | OIDC | Consentimento/autenticação | Provider opcional; tablet/credencial como fallback |
| **PPI (tabela)** | Leitura local | Validação territorial (M1) | Tabela configurável; sem dependência de rede |
| **SMS/e-mail** | Notificação | Avisos à eSF e usuário | Fila + MailHog em dev |

### Contrato e-SUS (interface)

```ts
// src/server/integrations/esus/contract.ts  (conceitual — sem código ainda)
interface EsusClient {
  getBaseline(cpf: string): Promise<Baseline | null>;
  getBaselineByCns(cns: string): Promise<Baseline | null>;
  writeMarker(ptsId: string): Promise<DeliveryReceipt>;
  writeReferral(ptsId: string): Promise<DeliveryReceipt>;
}
```

Implementações: `EsusClientMock` (dev/testes) e `EsusClientFhir` (piloto real, se A5 validado). Fluxo clínico depende só da interface.

## 6. Decisões registradas

Decisões de arquitetura em `docs/adr/` (formato Nygard) — respeitar, não reabrir:

| ADR | Decisão |
|---|---|
| 0001 | Node 22 LTS + Prisma |
| 0002 | Monólito modular (Next.js, bounded contexts) |
| 0003 | Avaliação com payload JSONB validado por Zod |
| 0004 | Versionamento do PTS por marcos + histórico (sem snapshot) |
| 0005 | Lock otimista + auditoria append-only na mesma transação |
| 0006 | Fila outbound em tabela PG (`SKIP LOCKED`), sem Redis |
| 0007 | Docker-first: imagem portável + compose; alvo de deploy plugável |
| 0008 | Integração por portas canônicas + adapters multi-formato |
| 0009 | RBAC configurável por papel (catálogo dinâmico + guardrails) |
| 0010 | Multi-instância per-org + `org_config` (branding por URL) |

Implementação dos blocos de acesso/admissão/identidade: `plano/17-rbac-multi-instancia.md`.

## 7. Referências

- Produto: `plano/06` (arquitetura de produto), `plano/05` (PRD/MVP), `Perguntas/03` (permissões).
- Roadmap técnico: Fase 1 = núcleo completo (metas + jornada), Fase 2 = governança + portal + RLS. Ver `plano/16`.
