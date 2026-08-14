# PM Skills — AI Shipping (2)

Documentação e auditoria para aplicações construídas com IA — o par que torna código "vibe-coded" revisável antes de ship.

## Fluxo típico

```
shipping-artifacts (documentar intenção) → intended-vs-implemented (auditar o gap)
```

---

## shipping-artifacts

- **O que faz**: define o conjunto durável de docs que torna app AI-built revisável. Core obrigatório (`architecture.md`, `flows.md`, `permissions.md`, `variables.md`, `tests.md`) + docs condicionais (emails, cron, SEO, agentes) adicionadas só quando a capacidade existe. Documenta intenção — o "estado pretendido" que toda auditoria compara contra o código.
- **Como invocar**: automático — "documentar para handoff", "shipping artifacts", "preparar para auditoria".
- **Quando usar**: documentar codebase para handoff, mapear jornadas e trust boundaries, planejar cobertura de teste, preparar auditoria de segurança/performance.
- **Quando NÃO usar**: repo sem código (doc de produto); quando o app ainda está em protótipo.
- **Exemplo**: app PTS Digital → `architecture.md` (stack, auth e-SUS, trust boundaries), `flows.md` (jornada de registro com authz em cada passo), `permissions.md` (papéis × recursos), `variables.md` (secrets, rotatividade), `tests.md` (mapa de verificação).

## intended-vs-implemented

- **O que faz**: método para achar o gap entre o que o sistema *deveria* fazer (documentado) e o que o código *faz* — a classe de bug que scanners genéricos não pegam porque não têm modelo de intenção. Para cada claim documentado, verifica enforcement no código; classifica mismatch por se atravessa trust/cost/data/tenant boundary; exige finding com intenção citada + evidência citada + atacante/vítima + fix.
- **Como invocar**: automático — "audite se o código bate com a doc", "acesso documentado mas não enforced?".
- **Quando usar**: auditar código AI-built, revisar acesso contra permissões documentadas, checar codebase contra própria documentação.
- **Quando NÃO usar**: sem docs de intenção (a ausência é o primeiro finding — documente primeiro com `shipping-artifacts`).
- **Exemplo**: doc diz "endpoint admin-only", código permite qualquer autenticado → finding com citação das duas pontas e fix.

## Limitações do grupo

- **Dependem de intenção documentada primeiro.** O par é sequencial: sem `shipping-artifacts`, `intended-vs-implemented` não tem o que auditar.
- **shipping-artifacts é mapa honesto, não clean bill of health** — exige brutal honestidade sobre estado atual.
- **intended-vs-implemented exige evidência citada (arquivo:linha)** — "provavelmente tratado upstream" não conta; o agente precisa de acesso completo ao código.
- **Não substitui auditorias de sink-level** (análise de segurança/performance em profundidade) — adiciona o eixo de intenção que elas não têm.