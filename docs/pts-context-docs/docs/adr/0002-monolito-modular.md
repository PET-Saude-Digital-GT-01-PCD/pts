# ADR-0002: Monólito modular (Next.js) com bounded contexts

## Status
Aceito

## Contexto
Plataforma com fluxo clínico integrado (recepção → triagem → SOAP → cogestão), time pequeno. Opções: monólito, monólito modular, microsserviços.

## Decisão
- **Monólito modular** em Next.js 15 (App Router). Pastas `src/server/{contexto}` = bounded contexts, comunicação por funções (sem HTTP interno).
- Contextos: `care-plan`, `reception`, `triage`, `clinical`, `governance`, `iam`, `integrations`, `shared`.
- Regra de dependência: `app → server/{contexto} → prisma`. `shared` não importa contexto nenhum.

## Consequências
- Positivas: deploy único, transações cross-context na mesma base, simplicidade operacional, coerência de tipos.
- Negativas: escala horizontal limitada; isolamento de falhas menor que microsserviços. Teto aceito para o piloto.
- Upgrade: extrair contextos para serviços quando necessário, sem mudar o modelo de dados.
