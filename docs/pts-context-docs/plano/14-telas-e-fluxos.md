# 14 — Telas e Fluxos

> **Input:** `Perguntas/05` (casos de uso, RF-UX), `plano/05` §7 · **Nível:** telas priorizadas, navegação, princípios

## 1. Priorização

**Núcleo estável — Fase 1 (entregar primeiro):**

| # | Tela | Ator | RF-UX | Estabilidade |
|---|---|---|---|---|
| 1 | Login | Todos | UC-01 | estável |
| 2 | Dashboard "Meus casos" por papel | Profissional | RF-UX-1 | estável |
| 3 | Painel do PTS (timeline + abas) | Equipe | RF-UX-2,3 | **núcleo** |
| 4 | Recepção: busca CPF/CNS + cadastro | Recepção | — | estável |
| 5 | Triagem: 3 eixos + semáforo | Triador | — | estável |
| 6 | SOAP: S/O/A/P + grade de serviços | Médico | RF-UX-4 | estável |
| 7 | Avaliação por especialidade (checklist → CIF) | Fisio/TO | RF-UX-4 | estável |
| 8 | Metas SMART guiadas + Painel de Metas Cruzadas | Equipe | RF-UX-5,6,7 | **núcleo** |
| 9 | Mural assíncrono do caso | Equipe | RF-UX-8 | núcleo |

**Pós-núcleo — Fase 2:**

| # | Tela | Ator | RF-UX |
|---|---|---|---|
| 10 | Registro de sessão (mínimos cliques) | Profissional | RF-UX-9 |
| 11 | Revisão/versão com comparativo | Referência | RF-UX-12 |
| 12 | Encerramento (alta/contrarreferência + plano APS) | Referência | RF-UX-13 |
| 13 | Dashboard governança (indicadores) | Gestor | UC-13 |
| 14 | Portal cidadão (percurso + metas acessíveis + consentimento) | Usuário/Cuidador | RF-UX-14 |

## 2. Navegação (sitemap)

```
/login
/dashboard                       # home por papel (tela 2)
/recepcao                        # busca e cadastro (4)
  └── /recepcao/novo             # cadastro + cuidador + consentimento + baseline
/casos/[ptsId]                   # PAINEL PTS (3)
  ├── #avaliacoes                # SOAP (6), fisio/TO (7) — abas por especialidade
  ├── #metas                     # metas SMART guiadas (8)
  ├── #mural                     # discussões (9)
  └── #triagem                   # semáforo (5)
/metas                           # painel de metas cruzadas (8)
/governanca                      # indicadores (13, Fase 2)
/portal                          # portal cidadão (14, Fase 2)
```

## 3. Princípios de UX (aplicados)

- **Home por função** — cada papel abre na visão do seu trabalho; nada de menu genérico (RF-UX-1).
- **Painel unificado** — timeline + status (semáforo) + abas (avaliação/metas/mural) em uma tela (RF-UX-2).
- **Abas por especialidade** — o profissional vê apenas o escopo da sua área (RF-UX-3).
- **Preenchimento preditivo** — checklist visual → códigos CIF em background; zero digitação de código (RF-UX-4).
- **Fórmula guiada de metas SMART** — autocompletar + campo livre (RF-UX-5).
- **Dupla linguagem** — técnica (equipe) + acessível (usuário) sincronizadas (RF-UX-6).
- **Metas cruzadas com conflito visual** — sinalização, nunca bloqueio (RF-UX-7).
- **Mural contextualizado** — discussão assíncrona dentro do caso; notificação backstage (RF-UX-8).
- **Nada bloqueia decisão clínica** — ajustes com justificativa; divergência saudável apenas sinaliza.

## 4. Detalhamento do núcleo (3, 8)

### Painel do PTS (tela 3)
- Header: paciente, status do PTS (semáforo de cor), semáforo de reunião, profissional de referência, equipe.
- Timeline: eventos, avaliações, revisões, encerramentos.
- Abas: Avaliações · Metas · Mural · Triagem.
- Dados pré-carregados da linha de base (origem destacada quando importada).

### Metas + Painel Cruzado (tela 8)
- Formulário SMART guiado: específico / mensurável / prazo / dono + campo livre.
- Dupla linguagem: `descTecnica` + `descAcessivel` lado a lado.
- Painel cruzado: todas as metas ativas do PTS, agrupadas por especialidade, com dono, prazo e status; conflitos de prazo/foco destacados visualmente.
- Transição de status com motivo (registra `meta_status_historico`).

## 5. Acessibilidade (LBI / WCAG)

- shadcn/ui/Radix por padrão (teclado, foco, ARIA).
- Portal cidadão: linguagem simples, contraste, leitura de tela (Fase 2).
- Jornada mediada pelo serviço quando necessário (WhatsApp pré-chegada, assistência da recepção).

## 6. Referências

- Casos de uso completos: `Perguntas/05`.
- Permissões por tela: `Perguntas/03` (matriz).
