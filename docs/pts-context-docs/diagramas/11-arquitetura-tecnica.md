# Diagrama — Arquitetura Técnica

> Complemento visual de `plano/11` (arquitetura), `plano/12` (dados) e `plano/15` (CI/CD). Renderiza automaticamente no GitHub.

## 1. Arquitetura em camadas (monólito modular)

```mermaid
flowchart TB
    subgraph UI["app/ (Next.js — server components + server actions)"]
        LOGIN[Login]
        DASH[Dashboard por papel]
        PANEL[Painel do PTS]
        REC[Recepção]
        TRI[Triagem]
        SOAP[SOAP]
        AVAL[Avaliação por especialidade]
        METAS[Metas + Painel cruzado]
        MURAL[Mural]
        GOV[Governança]
    end

    subgraph SERVER["server/ (bounded contexts)"]
        CP[care-plan<br/>pts · metas · revisões · mural · eventos]
        RCP[reception<br/>paciente · cuidador · consentimento · baseline]
        TRG[triage<br/>semáforo · elegibilidade · contrarreferência]
        CLI[clinical<br/>SOAP · avaliações]
        GOVS[governance<br/>indicadores · auditoria]
        IAM[iam<br/>usuários · papéis · acesso por caso]
        INT[integrations<br/>esus · ppi · notify · fila outbound]
        SH[shared<br/>zod · auditoria · lock · tipos]
    end

    subgraph DATA["Dados"]
        PG[("PostgreSQL 16<br/>Prisma")]
    end

    LOGIN --> IAM
    DASH --> IAM
    PANEL --> CP
    REC --> RCP
    TRI --> TRG
    SOAP --> CLI
    AVAL --> CLI
    METAS --> CP
    MURAL --> CP
    GOV --> GOVS

    CP --> SH
    RCP --> SH
    TRG --> SH
    CLI --> SH
    GOVS --> SH
    IAM --> SH
    INT --> SH

    CP --> PG
    RCP --> PG
    TRG --> PG
    CLI --> PG
    GOVS --> PG
    IAM --> PG
    INT --> PG

    INT -. "FHIR (mock primeiro)" .-> ESU[(e-SUS PEC)]
```

Regra de dependência: `app → server/{contexto} → prisma`. `shared` não importa contexto nenhum. Contextos não se importam diretamente.

## 2. Modelo entidade-relacionamento (físico)

```mermaid
erDiagram
    CER ||--o{ USUARIO : possui
    CER ||--o{ PACIENTE : vincula
    CER ||--o{ PPI_LOCAL : configura
    USUARIO }o--o{ PTS : "equipe de referencia"
    PACIENTE ||--o{ CUIDADOR : tem
    PACIENTE ||--o| CONSENTIMENTO : registra
    PACIENTE ||--o| BASELINE : importa
    PACIENTE ||--o{ PTS : "ciclos"
    PTS ||--o{ PTS_REVISAO : versiona
    PTS ||--o{ TRIAGEM : recebe
    TRIAGEM ||--o{ AJUSTE_CLASSIFICACAO : audita
    PTS ||--o{ AVALIACAO : contem
    PTS ||--o{ META : pactua
    AVALIACAO ||--o{ META : fundamenta
    META ||--o{ META_STATUS_HISTORICO : registra
    PTS ||--o{ DISCUSSAO : mural
    PTS ||--o{ EVENTO_CUIDADO : acompanha
    PTS ||--o{ OUTBOUND_QUEUE : envia
    USUARIO ||--o{ AUDITORIA : opera
```

FK `RESTRICT` em todo dado clínico filho do PTS (nada órfão). Detalhe por tabela: `plano/12`.

## 3. Transação crítica (mutação + auditoria)

```mermaid
sequenceDiagram
    actor U as Profissional
    participant SA as Server Action
    participant Z as Zod validation
    participant UC as Usecase (contexto)
    participant DB as PostgreSQL (transação)
    U->>SA: ação (classificação, meta, encerramento, consentimento)
    SA->>Z: input
    Z-->>SA: schema válido
    SA->>UC: regras de negócio
    UC->>DB: BEGIN
    UC->>DB: UPDATE dado WHERE id AND version=X
    UC->>DB: INSERT auditoria (actor, action, before, after, motivo)
    UC->>DB: version++
    UC->>DB: COMMIT
    DB-->>UC: ok (ou rollback)
    UC-->>SA: resultado
    SA-->>U: 200 / 409 (conflito → recarrega UI)
```

## 4. Fila outbound (worker)

```mermaid
flowchart LR
    TX[Transação da mutação] -->|INSERT outbound_queue| Q[(outbound_queue)]
    Q -->|poll SKIP LOCKED| W[Worker]
    W -->|retry backoff| R[Retry]
    W -->|entrega| EXT[e-SUS / notify]
    R -->|nextRetryAt <= now| Q
```

## 5. Pipeline CI/CD

```mermaid
flowchart LR
    subgraph CI["ci.yml (PR + main)"]
        A[install pnpm] --> B[typecheck]
        B --> C[lint]
        C --> D[vitest]
        D --> E[prisma migrate test db]
        E --> F[build]
        F --> G[playwright e2e]
    end
    G -->|ok| BUILD[build imagem Docker]
    BUILD --> PUSH[push registry GHCR]
    PUSH --> STG[deploy-staging.yml · PR]
    PUSH --> PROD[deploy-prod.yml · main]
    PROD --> MD[migrate deploy]
    MD --> DEP[deploy]
    DEP --> HC[health check]
    HC --> BK[backup pós-deploy]
```

Gates: CI falhou → sem deploy. Alvo de deploy (VPS/plataforma) plugável — ADR 0007.
