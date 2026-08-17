# PTS Digital — Contexto e Documentação

Repositório de contexto do projeto **PTS Digital**: plataforma de gestão do **Projeto Terapêutico Singular (PTS)** para **Centros Especializados em Reabilitação (CER)** do SUS.

Reúne a base conceitual original, o plano completo de formulação e desenvolvimento da ideia e os documentos de resposta aos questionamentos técnicos iniciais (processo assistencial, dados, usos, legislação, UX, indicadores).

---

## O que é o projeto

O PTS é o principal instrumento de gestão do cuidado nos CER, e sua operação é hoje comprometida por registros fragmentados, comunicação assíncrona e sobrecarga burocrática. O projeto propõe uma plataforma digital que:

- conduz a Pessoa com Deficiência (PCD) por uma jornada completa — recepção, triagem, avaliação médica (SOAP), avaliações multiprofissionais, pactuação de metas, acompanhamento e contrarreferência;
- integra-se ao e-SUS PEC (API FHIR) para eliminar retrabalho de registro e dar continuidade do cuidado na Atenção Primária;
- materializa a cogestão do cuidado: metas pactuadas, equipe de referência e PTS vivo, não burocrático.

---

## Estrutura do repositório

```
pts-context-docs/
├── README.md                     # este documento
├── base/                         # documentos-fonte originais
│   ├── pts.md                    #   fundamentos teórico-conceituais do PTS
│   ├── Plano ... Digital ...md   #   arquitetura e funcionalidades da solução digital
│   └── Plano ... Guia ...md      #   visão operacional e módulos do sistema
├── plano/                        # plano de formulação e desenvolvimento
│   ├── 00-index.md               #   mapa de navegação e ordem de leitura
│   ├── 01-fundamentos-teoricos.md
│   ├── 02-diagnostico-ambiente.md
│   ├── 03-descoberta-usuarios.md
│   ├── 04-estrategia-produto.md
│   ├── 05-prd-requisitos.md
│   ├── 06-arquitetura-dados.md
│   ├── 07-roadmap-implementacao.md
│   ├── 08-riscos-redteam.md
│   ├── 09-governanca-avaliacao.md
│   ├── 10-adocao-crescimento.md
│   ├── 11-arquitetura-tecnica.md
│   ├── 12-modelo-de-dados.md
│   ├── 13-regras-negocio-concorrencia.md
│   ├── 14-telas-e-fluxos.md
│   ├── 15-infra-ci-cd-deploy.md
│   ├── 16-ciclos-engenharia.md
│   └── 17-rbac-multi-instancia.md
└── Perguntas/                    # respostas detalhadas aos 6 questionamentos iniciais
    ├── 01-processo-assistencial-pts.md
    ├── 02-dados-modelagem.md
    ├── 03-usuarios-permissoes.md
    ├── 04-legislacao-requisitos-nao-funcionais.md
    ├── 05-ux-casos-de-uso.md
    └── 06-gestao-indicadores-oubi.md
```

Os diagramas da documentação usam **Mermaid** e renderizam automaticamente no GitHub. O índice de diagramas está em [`diagramas/README.md`](diagramas/README.md).

Os planos técnico/operacional (`plano/11`–`17`) e as decisões de arquitetura em [`docs/adr/`](docs/adr/) definem a implementação: stack (Node 22 · Next.js 15 · Prisma · PostgreSQL 16 · Docker), modelo de dados, regras de concorrência, telas, CI/CD, fluxo de engenharia (Superpowers) e adaptação por organização (RBAC/admissão/branding).

> Diagrama renderizado nativamente pelo GitHub em qualquer arquivo `.md` que contenha bloco ` ```mermaid `.

---

## Como navegar

### Rota de leitura completa (recomendada)

```
base/pts.md
  → plano/01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10
      (fundamentos → ambiente → usuários → estratégia → requisitos →
       arquitetura → roadmap → riscos → avaliação → adoção)
  → plano/11 → 12 → 13 → 14 → 15 → 16
      (arquitetura técnica → modelo de dados → regras/concorrência →
       telas → infra/CI-CD → ciclos de engenharia)
  → plano/17
      (RBAC configurável → admissão → multi-instância/branding)
```

### Consulta por tema

| Tema | Onde |
|---|---|
| Fundamento teórico e marco normativo | `base/pts.md`, `plano/01` |
| Diagnóstico do ambiente (PESTLE, 5 Forças, SWOT, concorrentes) | `plano/02` |
| Personas, jornadas e dores | `plano/03` |
| Estratégia, visão e modelo de negócio | `plano/04` |
| PRD, funcionalidades e backlog | `plano/05` |
| Arquitetura em nível de produto, dados e integrações | `plano/06` |
| Roadmap, fases e go/no-go | `plano/07` |
| Riscos, pre-mortem e red team | `plano/08` |
| Métricas e avaliação de impacto | `plano/09` |
| Adoção, cultura e crescimento | `plano/10` |
| Processo assistencial (ciclo de vida do PTS) | `Perguntas/01` |
| Modelagem de dados | `Perguntas/02` |
| Atores e permissões | `Perguntas/03` |
| Legislação e requisitos não funcionais | `Perguntas/04` |
| Casos de uso, requisitos funcionais e UX | `Perguntas/05` |
| Indicadores de gestão (BI) | `Perguntas/06` |
| **Arquitetura técnica (stack, camadas, integrações)** | `plano/11` |
| **Modelo de dados físico (ER, tabelas, índices)** | `plano/12` |
| **Regras de negócio e concorrência** | `plano/13` |
| **Telas e fluxos priorizados** | `plano/14` |
| **Infra, CI/CD e deploy** | `plano/15` |
| **Ciclos de engenharia (Superpowers)** | `plano/16` |
| **RBAC configurável, admissão e multi-instância** | `plano/17` |
| **Decisões de arquitetura (ADRs)** | `docs/adr/` |

### Documentos-fonte do contexto

| Arquivo | Conteúdo | Papel |
|---|---|---|
| `base/pts.md` | Fundamentos teóricos e conceituais do PTS | Base dos documentos de planejamento |
| `base/Plano Terapêutico Singular (PTS) Digital - Estrutura e Funcionalidades.md` | Arquitetura funcional da solução digital | Base do PRD e arquitetura |
| `base/Plano Terapêutico Singular (PTS) - Guia de Implementação Operacional.md` | Visão operacional e módulos do sistema | Base do PRD, arquitetura e roadmap |

---

## Nota metodológica

O plano foi construído com método de Product Management estruturado — análise estratégica (PESTLE, 5 Forças, SWOT), descoberta centrada no usuário (personas, jornadas, JTBD), Product Strategy Canvas, PRD com backlog em formato WWA, arquitetura em nível de produto, governança por métricas (North Star) e disciplina de risco (pre-mortem, red team).

## Pendência documentada

A citação literal de textos normativos (teor de artigos e portarias) no documento `Perguntas/04-legislacao-requisitos-nao-funcionais.md` ainda requer verificação em fonte primária antes de publicação acadêmica formal.

---

*Discentes: Ana Rita de Oliveira, Ana Cláudia Coutinho, Stephanie Patriota e Gustavo Henrique Verçosa.*