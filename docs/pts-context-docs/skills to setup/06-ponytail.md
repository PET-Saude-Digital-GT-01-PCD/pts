# Ponytail (6)

Plugin de **minimalismo de código** para agentes. Filosofia: desenvolvedor sênior preguiçoso — eficiente, não descuidado. "O melhor código é o que nunca foi escrito." Workflow antídoto para over-engineering.

Local: `~/.claude/plugins/cache/ponytail/ponytail/4.8.4/skills/`.

## Core: ponytail

- **O que faz**: define o modo — a **ladder** (escada) de decisão: (1) existe mesmo? (YAGNI), (2) stdlib resolve? (3) feature nativa cobre? (4) dependência já instalada? (5) dá pra ser uma linha? (6) só então: código mínimo. Regras: sem abstrações não solicitadas, sem boilerplate "para depois", deleção > adição, boring > clever, poucos arquivos, diff curto vence. Marca simplificações deliberadas com comentário `ponytail:` nomeando o teto e o upgrade path. **Não simplificar nunca**: validação de input em trust boundary, tratamento de erro que previne perda de dados, segurança, acessibilidade básica, o que foi explicitamente pedido. Não-trivial deixa 1 check runnable (assert-based demo ou 1 test_*.py).
- **Como invocar**: automático — ao escrever código; níveis `/ponytail lite|full|ultra`; desliga "stop ponytail"/"normal mode".
- **Quando usar**: qualquer tarefa de codificação.
- **Quando NÃO usar**: usuário pediu explicitamente a versão completa (build sem re-argumentar); requisitos de segurança/dados que exigem robustez.
- **Exemplo**: pediu cache de API → `@lru_cache` na função fetch, não classe de cache customizada.
- **Pattern de saída**: `[código] → skipped: [X], add when [Y].`

## Skills de suporte

### ponytail-audit

- **O que faz**: audita um diff/código existente sob a ótica ponytail — acha onde o código poderia ser mais enxuto, abstrações desnecessárias, over-engineering.
- **Como invocar**: automático — "audite esse código sob ponytail", "onde isso está over-engineered?".
- **Quando usar**: revisar código legado/recém-escrito buscando simplificação.
- **Quando NÃO usar**: —.

### ponytail-debt

- **O que faz**: mantém registro de dívida técnica consciente — onde o `ponytail:` foi aplicado, qual o teto assumido, qual o upgrade path. Vira tracking do "só adicionar quando precisar".
- **Como invocar**: automático — ao aplicar simplificação com teto conhecido.
- **Quando usar**: qualquer simplificação deliberada com upgrade path.
- **Quando NÃO usar**: código trivial sem dívida.
- **Exemplo**: entrada de dívida: "global lock — teto: throughput baixo; upgrade: per-account locks quando throughput importar".

### ponytail-gain

- **O que faz**: identifica oportunidades de ganho de simplicidade em codebase existente — o espelho positivo do debt (o que remover agora).
- **Como invocar**: automático — "onde dá para simplificar?", "reduza esse código".
- **Quando usar**: redução ativa de código.
- **Quando NÃO usar**: —.

### ponytail-help

- **O que faz**: cartão de referência rápida do modo ponytail (ladder, regras, níveis).
- **Como invocar**: `/ponytail-help`.
- **Quando usar**: consultar as regras.
- **Quando NÃO usar**: —.

### ponytail-review

- **O que faz**: review de PR/diff com lente ponytail — encontra over-engineering, abstrações prematuras, código que não deveria existir; sugere deleções.
- **Como invocar**: automático — "review ponytail desta PR".
- **Quando usar**: revisar PR buscando minimalismo.
- **Quando NÃO usar**: —.

## Limitações do grupo

- **Pendulum risk** — ponytail empurra para o mínimo; em codebases críticos de segurança/finanças pode puxar para baixo demais. O próprio modo reconhece exceções (nunca simplificar segurança/validação/perda de dados).
- **Código mínimo ≠ código claro** — "boring" é preferido, mas o modo pode levar a one-liners ilegíveis se mal aplicado.
- **Dívida consciente precisa ser rastreada** — sem `ponytail-debt`, simplificações somem e o teto fica invisível.
- **Check runnable obrigatório** é o corretivo do minimalismo — pular o "um teste que falha se a lógica quebrar" desrespeita o contrato do modo.