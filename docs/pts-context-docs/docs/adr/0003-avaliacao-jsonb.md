# ADR-0003: Avaliação com payload JSONB validado por Zod

## Status
Aceito

## Contexto
Avaliações por especialidade (SOAP, Fisio/CIF, TO/AVD, Psico) têm estruturas diferentes e evoluem com frequência. Alternativas: tabela por especialidade, tabela única com colunas genéricas, tabela única com JSONB.

## Decisão
- **Uma tabela `avaliacao`** com `especialidade` (enum) + `dadosJson` (JSONB) + `escoresJson`.
- Estrutura validada por **Zod** (schema por especialidade) na fronteira de entrada e saída.
- Colunas extraídas (escores) quando necessário para query/report.

## Consequências
- Positivas: flexibilidade por especialidade sem migration por campo; menos tabelas quase-idênticas.
- Negativas: queries sobre payload exigem extração/índices específicos; zod deve espelhar o schema (fonte única no schema).
- `ponytail:` teto = tabelas separadas quando uma especialidade precisar de query própria pesada; upgrade = extração + migration de split.
