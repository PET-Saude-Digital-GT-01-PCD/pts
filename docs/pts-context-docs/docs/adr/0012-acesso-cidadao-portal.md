# ADR-0012: Acesso do cidadão ao portal (código de acesso + sessão por cookie)

## Status
Aceito — resolve a pendência de arquitetura do portal do cidadão (#73,
comentário `ponytail:` em `src/server/care-plan/portal.ts`).

## Contexto
O portal `/portal/[ptsId]` já entrega percurso e metas em linguagem acessível,
mas reaproveitava a sessão da equipe: quem via o portal era o profissional,
não o cidadão. O paciente e o cuidador não tinham como entrar. As opções
sobre a mesa eram link mágico por e-mail/WhatsApp, código de acesso na
recepção ou provider externo (Gov.br). O contexto mudou desde a abertura da
questão:

- `Paciente`/`Cuidador` não têm canal de contato no modelo (sem e-mail,
  telefone ou WhatsApp) — qualquer "link mágico" exigiria primeiro expor PII
  nova no cadastro.
- O único transporte de notificação existente é SMTP dev-grade
  (`src/server/integrations/notify/smtp.ts`, relay local sem TLS, `ponytail:`
  do ADR-0008) e em produção (Vercel, ADR-0011) não há SMTP configurado —
  envio cairia em silêncio.
- Não há canal de WhatsApp/SMS no sistema.
- O público-alvo inclui pessoas sem smartphone (premisso explícito da task);
  exigir dispositivo próprio para ver o próprio cuidado seria exclusão.
- Deploy serverless (Vercel) sem estado em memória: rate limit por IP é frágil
  sem store externo.

## Decisão

- **Mecanismo: código de acesso por paciente, emitido pela recepção.**
  Token de ~50 bits em Crockford base32 (10 chars, sem caracteres ambíguos),
  gerado no ato do atendimento e entregue impresso/QR. O link canônico é
  `/portal?acesso=<codigo>&pts=<ptsId>` (o QR abre direto); quem não tem
  smartphone digita o código no formulário de `/portal`. Um único segredo,
  tanto no QR quanto na digitação.
- **Troca por sessão**: `GET /api/portal/entrar` valida o código e troca por
  cookie `portal_acesso` (HttpOnly, Secure em prod, SameSite=Lax, TTL por
  env `PORTAL_ACESSO_TTL_DIAS`, default 30 dias), redirecionando para
  `/portal/[ptsId]`. O formulário de digitação usa `method="GET"` apontando
  para o mesmo handler — sem JS, sem server action.
- **Persistência**: model `AcessoCidadao` guarda apenas
  `HMAC-SHA256(AUTH_SECRET, token)` — um vazamento do banco não permite
  recuperar nem validar códigos por força bruta offline —, nunca o código em
  claro; `validoAte`, `emitidoPorId`, `usadoEm`,
  revogação explícita pela recepção (recurso `recepcao.portal.emitir`).
  A sessão é a própria credencial (sem tabela de sessão): o cookie guarda o
  código e é revalidado contra o hash a cada request, então revogação e
  expiração derrubam a sessão na hora. **Uma única credencial ativa por
  paciente**: reemitir (ex.: código perdido) revoga a anterior na mesma
  transação, com auditoria (`motivo: substituido_por_nova_emissao`), de modo
  que só o código mais recente entra — o antigo para de funcionar
  imediatamente.
- **Escopo do acesso**: a credencial é do **paciente** (não do PTS — um
  paciente pode ter mais de um PTS); o gate do portal exige
  `pts.pacienteId === sessao.pacienteId`. A equipe continua tendo acesso pelo
  caminho de sempre (permissão + vínculo ao caso) — o portal serve também de
  conferência para a equipe. Emitida antes de existir PTS (caso ainda não
  aberto ou não elegível na triagem), a entrada é aceita e `/portal` mostra
  "aguardando avaliação" — nunca o erro genérico de "código inválido", já que
  o código foi legitimamente emitido pela recepção.
- **Auditoria**: o ator da `Auditoria` é generalizado — `actorId` anulável +
  `actorTipo (USUARIO | CIDADAO | SISTEMA)` + `actorPacienteId` (FK
  `Paciente`). A troca de código por sessão grava `portal.acesso.entrar` na
  mesma transação do `usadoEm`, com `entityType: "paciente"` e o `ptsId`
  resolvido em `afterJson` (uma linha **por sessão**, não por render);
  emissão/revogação são atos da equipe e seguem o
  padrão normal (`actorId` de usuário). Leak não auditado: miss com hash não
  encontrado (ator desconhecido) — a entropia do código é o rate limit.
- **LGPD**: minimização — o portal só expõe percurso e metas acessíveis
  (`portal-formatacao.ts` nunca vaza dado técnico); titular tem legitimidade
  própria para o próprio dado (art. 18). **Não coletamos IP nem user-agent**
  do acesso: em serverless seriam inúteis sem store e, sendo dado pessoal
  de terceiro, só trariam dever de retenção.
- **Fora deste escopo** (follow-up): consentimento e pré-chegada do cuidador
  pelo portal (`Perguntas/03 §3.7`) — quando chegarem, usam o mesmo ator
  `CIDADAO` na trilha.

Alternativas rejeitadas:

- **Link mágico por e-mail**: exige campo de contato novo em `Paciente` +
  SMTP de produção inexistente (ADR-0008/0011) — dependência dupla para algo
  que a recepção resolve no balcão.
- **WhatsApp/SMS**: não há canal no sistema; integração paga e LGPD de
  mensagem terceirizada.
- **Usuário-serviço como ator da auditoria** (sem mudar a `Auditoria`):
  mentira semântica (o ator é o cidadão), polui listagens e guardrails de
  IAM; rejeitado em favor de generalizar o ator.
- **Tabela de log de acesso separada**: fragmentaria a trilha (a task pede
  auditoria "como no resto do sistema") e hoje não temos o que registrar
  nela que a `Auditoria` não carregue.

## Consequências
- Positivas: cidadão entra com próprio acesso, sem conta nem PII de contato;
  trilha única com viewer de governança já existente; revogável a qualquer
  momento pela recepção; funciona offline de canal (impresso) e em
  aparelho compartilhado (botão "Sair do portal").
- Negativas: quem tem o código vê o portal (segredo físico — mitigado por
  TTL curto + revogação); código em URL de link vira log de acesso do
  proxy/CDN (aceito, mesmo custo de qualquer magic link); brute force não é
  observado na trilha (miss sem hash conhecido não gera evento).
- `ponytail:` teto = 1 credencial ativa por paciente (reemissão revoga a
  anterior), código exibido só na emissão, TTL fixo por env, sem rate limit
  distribuído, auditoria por sessão e não por page view.
  Upgrade = TTL por `OrgConfig`, rate limit por IP (WAF/Upstash) e log de IP
  hasheado com TTL próprio em tabela separada se houver necessidade forense.
