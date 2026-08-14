# 13 — Regras de Negócio e Concorrência

> **Input:** `Perguntas/01–03`, `plano/06` §7 · **Decisões:** ADR 0005, 0006 · **Nível:** regras determinísticas, transações, locking, filas

## 1. Princípios

- **Clínica decide; algoritmo auxilia.** Nenhuma regra bloqueia decisão clínica — divergência manual é permitida com justificativa auditável.
- **Regra determinística** = função pura, TDD obrigatório (AGENTS.md).
- **Dado e auditoria na mesma transação** — nunca existe mutação sem trilha.
- **Append-only** para trilha: nunca update/delete.

## 2. Semáforo do Cuidado (triage)

Função pura:

```ts
calcularSemaforo(eixos: EixosTriagem, escopoCER: Escopo[]): { classificacao, pontuacao, regras[] }
```

- Entrada: eixos clínico (CID/motivo), funcional (4 sliders: mobilidade, comunicação, cognição, autocuidado), social (cuidador, vulnerabilidades).
- Saída: `VERDE` (retorno APS) / `AMARELO` (fila com tempo estimado) / `VERMELHO` (admissão imediata).
- `pontuacaoJson` persiste a composição — reprodutibilidade garantida para o mesmo input.
- Regras por escopo do CER são configuráveis (tabela `cer.escopos`).

**Concorrência:** reclassificação concorrente sobre a mesma triagem → lock otimista (`versao`); conflito → 409 → UI recarrega.

## 3. Ajuste clínico manual

- Qualquer divergência do algoritmo escreve um novo registro em `ajuste_classificacao` (append-only: `de`, `para`, `motivo` obrigatório, autor, data) — **nunca sobrescreve**.
- Classificação vigente = registro mais recente; histórico integral preservado.
- Verificação de auditoria: toda reclassificação manual rastreável (quem, quando, por quê).

## 4. Elegibilidade por escopo CER

- Regras por modalidade (Física, Intelectual, Visual, Auditiva).
- Reprovação exige justificativa obrigatória.
- Função pura determinística — coberta por testes unitários.

## 5. Transações críticas (padrão)

Toda mutação crítica segue o mesmo molde:

```
BEGIN
  valida regras de negócio (zod + regras do contexto)
  UPDATE/INSERT dado  (WHERE id AND version = X)
  INSERT auditoria    (actor, action, before, after, motivo)
  version++
COMMIT
```

Falha em qualquer passo → rollback completo. Operações críticas: classificação do semáforo, ajuste manual, criação/status de meta, encerramento do PTS, consentimento.

## 6. Lock otimista

- Coluna `version` em `pts`, `triagem`, `avaliacao`, `meta`.
- Update condicional `WHERE id = ? AND version = ?`; `affectedRows = 0` → conflito → **409 Conflict** → cliente recarrega dados e reaplica decisão.
- Escolhido sobre `SELECT FOR UPDATE` porque a concorrência real por PTS é baixa (equipe pequena, pactuação em reunião) e otimista evita transações longas.
- `ponytail:` se houver bursts de escrita no mesmo PTS (ex.: múltiplos profissionais salvando meta ao mesmo instante), evoluir para row lock explícito no PTS durante batch de metas.

## 7. Pactuação de metas

- Meta tem dono único; status transiciona `NOVA → EM_ANDAMENTO → CONCLUIDA|NAO_ALCANCADA`.
- Toda transição grava `meta_status_historico` (append-only) → alimenta comparativo entre revisões.
- Dupla linguagem obrigatória: `descTecnica` + `descAcessivel`.
- Conflitos de prazo/foco entre metas de especialidades diferentes → **sinalização visual** no painel cruzado (nunca bloqueio).

## 8. Fila outbound (integrações)

- Escritas externas (marcador e-SUS, contrarreferência, notificações) **nunca** executam inline no fluxo clínico.
- Enfileiramento: INSERT em `outbound_queue` na mesma transação da mutação que o gerou.
- Worker: poll com `SELECT ... FOR UPDATE SKIP LOCKED` por status `PENDING` e `nextRetryAt <= now()`.
- Retry com backoff exponencial; `attempts` e `lastError` persistem.
- Idempotência: `payloadJson` + hash no retry.
- `ponytail:` sem Redis — tabela PG basta para volume de piloto; teto = fila dedicada (Redis/RabbitMQ) quando throughput ou TTL de retenção exigir.

## 9. Recepção degradada (resiliência)

- e-SUS indisponível → cadastro provisório com `paciente.origem = digitado`, flag de pendência.
- Sincronização tenta enriquecer baseline depois; `origemJson` registra por campo o que veio de onde.
- Nada trava a recepção: fluxo de cadastro não depende de resposta externa.

## 10. Regras de acesso (enforcement)

- **iam** decide antes de qualquer usecase de escrita: papel global + vinculação ao caso (equipe de referência ou profissional de referência).
- Gestor: leitura agregada/auditoria; **bloqueado** de conteúdo clínico individual (LGPD).
- PTS `FECHADO` → somente leitura para a equipe.
- Reabertura/encerramento: justificativa obrigatória.

## 11. Núcleo com TDD obrigatório

| Função | Contexto | Tipo |
|---|---|---|
| `calcularSemaforo` | triage | pura |
| `elegibilidadePorEscopo` | triage | pura |
| `calcularDivergencia` | clinical | pura |
| `semforoDeReuniao` | care-plan | pura |
| `verificarConflitoMetas` | care-plan | pura |

Todas determinísticas, sem I/O — casos de borda documentados como testes Vitest.
