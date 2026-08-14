# ADR-0005: Lock otimista + auditoria append-only na mesma transação

## Status
Aceito

## Contexto
Mutações críticas (classificação, meta, encerramento, consentimento) exigem consistência e trilha inviolável. Riscos: perda de atualização concorrente e auditoria dessincronizada da mutação.

## Decisão
- Coluna `version` em rows mutáveis (`pts`, `triagem`, `avaliacao`, `meta`); update `WHERE id AND version = X`; conflito → **409** → UI recarrega.
- Auditoria **append-only** (`auditoria`, `ajuste_classificacao`, `meta_status_historico`), gravada **na mesma transação** da mutação. Nunca update/delete.

## Consequências
- Positivas: sem perda de atualização; trilha consistente por transação; conflito tratado de forma explícita na UI.
- Negativas: cliente precisa lidar com 409 (retry/reload); auditoria cresce sem limite (retenção definida por LGPD/norma).
- Upgrade (se bursts de escrita no mesmo PTS): row lock explícito no PTS durante batch de metas.
