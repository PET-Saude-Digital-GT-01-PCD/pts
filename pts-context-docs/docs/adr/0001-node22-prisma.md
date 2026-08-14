# ADR-0001: Node 22 LTS + Prisma para o write model

## Status
Aceito

## Contexto
A plataforma precisa de um runtime estável e um ORM com migrations e types, para um time acadêmico com restrições de tempo e experiência. Candidatos: Node vs Bun; Prisma vs Drizzle.

## Decisão
- Runtime: **Node 22 LTS** (Docker). Máxima compatibilidade de tooling (Next.js, Prisma); Bun fica opcional só em dev.
- ORM: **Prisma**. Migrations, geração de tipos e enums; DX superior para o time.

## Consequências
- Positivas: ecossistema maduro; migrations versionadas; menos fricção de setup.
- Negativas: Prisma abstrai SQL (menos controle fino em queries complexas); lock otimista exige update condicional manual.
