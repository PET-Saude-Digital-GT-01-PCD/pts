# ADR-0004: Versionamento do PTS por marcos + histórico (sem snapshot)

## Status
Aceito

## Contexto
O PTS é reavaliado periodicamente e o comparativo entre versões ("o que mudou") é requisito (RF-UX-12). Alternativas: snapshot completo por revisão, tabelas temporais, versionamento por marcos + histórico append-only.

## Decisão
- **`pts_revisao`** = marco imutável (número, motivo, autor, data).
- Comparativo derivado de dados vivos + trilhas append-only (`meta_status_historico`, `auditoria`, `ajuste_classificacao`) entre dois marcos.
- Metas e avaliações continuam nas tabelas vivas com histórico de status; nenhuma cópia snapshot.

## Consequências
- Positivas: um único source of truth; sem dupla escrita (dado + snapshot); históricos já existem por auditoria.
- Negativas: comparativo é consulta (não leitura direta); relatório pesado pode exigir materialização.
- `ponytail:` teto = tabela de snapshot por revisão quando o comparativo virar relatório frequente/online; upgrade = worker de materialização.
