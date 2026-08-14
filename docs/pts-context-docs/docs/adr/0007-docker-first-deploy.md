# ADR-0007: Docker-first — imagem portável + compose, alvo de deploy plugável

## Status
Aceito

## Contexto
Contexto acadêmico sem servidor próprio garantido (plano/07). O alvo de produção ainda não está definido (VPS gerenciado vs plataforma). A escolha de deploy não pode prender o código.

## Decisão
- **Dockerfile** multi-stage (build → runtime Node 22 slim, non-root) produz imagem imutável e versionada.
- `docker-compose.yml` cobre dev e staging (app + postgres:16 + mailhog) — portável para qualquer VPS.
- CI publica a imagem no registry; o passo final do deploy aponta para o alvo escolhido na Fase 2 (VPS+Caddy ou Railway/Fly/Render). O código não muda quando o alvo mudar.

## Consequências
- Positivas: portabilidade total; mesma imagem em todos os ambientes; decisão de alvo adiada sem custo.
- Negativas: exige registry (GHCR) e config de secrets por ambiente; VPS adiciona manutenção própria.
