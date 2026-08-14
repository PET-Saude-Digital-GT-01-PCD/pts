# Diagramas Mermaid

Diagramas **Mermaid** (linguagem de diagramas) usados na documentação do PTS Digital. Renderizam automaticamente no GitHub quando aberto o `.md` que os contém.

## Índice de diagramas

| Diagrama | Tipo | Onde está |
|---|---|---|
| **Ciclo de vida do PTS** (nascimento → evolução → término) | `flowchart` | `Perguntas/01-processo-assistencial-pts.md` §2 |
| **Máquina de estados do PTS** (triagem → alta/contrarreferência/descontinuação → fechado) | `stateDiagram` | `Perguntas/01-processo-assistencial-pts.md` §6 |
| **Modelo entidade-relacionamento** (paciente, cuidador, PTS, avaliações, metas, eventos, mural) | `erDiagram` | `Perguntas/02-dados-modelagem.md` §2 |
| **Jornada do profissional** (login → avaliação → metas → acompanhamento → encerrar) | `flowchart` | `Perguntas/05-ux-casos-de-uso.md` §7 |
| **Dependências do plano** (docs 01–10 + retroalimentação) | `flowchart` | `plano/00-index.md` |
| **Arquitetura do sistema** (módulos M1–M6 + integrações e-SUS, PPI, Gov.br) | `flowchart` | `plano/06-arquitetura-dados.md` §2 |
| **Arquitetura técnica** (camadas, ER físico, transação, fila, CI/CD) | `flowchart` + `erDiagram` + `sequenceDiagram` | `11-arquitetura-tecnica.md` |

## Como editar

- Diagramas seguem a sintaxe Mermaid: <https://mermaid.js.org/syntax/flowchart.html>.
- Alterou um diagrama? Valide antes de commitar:

```bash
# parser puro (sem navegador), no diretório do repo com mermaid instalado
mmdc -i diagrama.mmd -o /dev/null
```

## Renderização

- **GitHub:** blocos ` ```mermaid ` renderizam nativamente em `.md`.
- **Local (VS Code):** extensão "Mermaid Preview" ou Live Preview.
- **Exportar imagem/PDF:** use `mmdc` (mermaid-cli):

```bash
npx -y @mermaid-js/mermaid-cli -i diagrama.mmd -o diagrama.png
```