# ADR-0006: Fila outbound em tabela PostgreSQL (sem Redis)

## Status
Aceito

## Contexto
Escritas externas (marcador e-SUS, contrarreferência, notificações) não podem executar inline no fluxo clínico nem travar por indisponibilidade da integração. Necessário enfileiramento com retry.

## Decisão
- Tabela **`outbound_queue`** em PostgreSQL; worker com `SELECT ... FOR UPDATE SKIP LOCKED`.
- Retry com backoff exponencial (`attempts`, `lastError`, `nextRetryAt`); idempotência por hash do payload.
- Sem Redis/RabbitMQ.

## Consequências
- Positivas: zero infra adicional; consistência com a base (enfileira na mesma transação da mutação); suficiente para volume de piloto.
- Negativas: fila acoplada ao banco; throughput limitado; retenção/lixo da fila precisa de limpeza periódica.
- `ponytail:` teto = fila dedicada quando throughput ou TTL de retenção exigir; upgrade = trocar o worker sem mudar contrato.
