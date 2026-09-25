# ADR-0012: Acesso do cidadão ao PTS por link com código

## Status
Aceito

## Contexto
O portal do cidadão (`/portal/[ptsId]`) mostra o percurso e as metas do PTS em linguagem acessível, mas era um protótipo: reaproveitava a sessão da equipe, então quem via o portal era o profissional, não o cidadão. Paciente e cuidador não tinham como entrar — não têm conta, e-mail nem telefone no modelo atual (`Paciente`/`Cuidador` não são identidade de autenticação).

Restrições que a decisão precisou respeitar: o cidadão acessa **o próprio** PTS e nada além disso; a emissão é mutação sensível (exposição de dado de saúde) e portanto auditável; revogação precisa ser imediata quando o link vaza; o modelo `Auditoria` exige `actorId` (FK `Usuario`), ou seja, não representa o cidadão.

## Decisão
- **Link com código, sem conta.** O cidadão acessa `/portal-cidadao/<código>`, rota pública. O código no fim da URL é a credencial: quem tiver o link vê o percurso e as metas daquele PTS.
- **`acesso_cidadao`**: `codigoHash` (sha256) `@unique` — o código cru existe só na resposta da action, nunca no banco; `ptsId` (escopo), `criadoPorId`, `criadoEm`, `expiraEm` (30 dias), `revogadoEm`, `ultimoAcessoEm`, `totalAcessos`.
- **Código**: Crockford base32 sem `I/L/O/U`, 10 caracteres exibidos `XXXXX-XXXXX` (≈50 bits) — legível ao telefone, sem skim de caracteres ambíguos. Aceita minúsculo, com/sem hífen e `I/L/O/U` no lugar de `1/1/0/0`.
- **Um link ativo por PTS.** Emitir de novo revoga o anterior na mesma transação (`revogadoEm`, sem `delete` — append-only, como o resto do sistema). É o caminho de "não confio mais naquele link".
- **Permissão `portal.cidadao.acesso`** (data-driven, ADR-0009): recepção, papéis clínicos e gestor por padrão. O grupo do recurso **não** é `care-plan.*` de propósito: `visaoPorRecursos` (dashboard) classifica visão `CLINICA` por prefixo `care-plan.`/`clinical.`, então um recurso de portal em `care-plan.*` tiraria recepção/triador da visão `RECEPCAO_TRIAGEM` (e do alerta de PPI). O guardrail de `iam/permissoes.ts` não o restringe porque não é recurso clínico.
- **Auditoria**: emissão (`acesso_cidadao.gerar`) e revogação (`acesso_cidadao.revogar`) na trilha `Auditoria`, com `actorId` = profissional que agiu. O acesso do cidadão **não** vira linha de `Auditoria` — sem identidade de ator, forçar um `Usuario` seria inventar dado; no lugar disso, `acesso_cidadao_log` guarda **o momento** de cada abertura (append-only, uma linha por acesso), e `ultimoAcessoEm`/`totalAcessos` alimentam a tela do caso.
- **Falha ao registrar o acesso nunca bloqueia a visão** do cidadão (mesmo princípio de ADR-0008).
- A visão da equipe em `/portal/[ptsId]` permanece, para conferência, com a mesma projeção mínima (`PortalCidadaoConteudo` compartilhado entre as duas rotas). Estados de link inválido/revogado/expirado viram recado para o cidadão, não 404 cru.
- **Onde a recepção encontra a função.** O bloco `AcessoCidadao` vive na **ficha do paciente** (`/pacientes/[id]`), que é a tela de trabalho da recepção (`recepcao.paciente.ver`), e também no painel do caso (`/casos/[ptsId]`) para a equipe clínica — mesmo componente (`components/portal/acesso-cidadao-bloco.tsx`). `/casos/[ptsId]` exige `care-plan.meta.ler`/`clinical.soap.ler`/`triage.triagem.ver` **e** vínculo com o caso, então a recepção não chega lá; e como `paciente` não tem campo de equipe, o card na ficha aparece para quem tem `portal.cidadao.acesso` (o vínculo não se aplica). Sem PTS ativo, a ficha explica que o link fica disponível depois que a triagem abrir o caso. Pelo mesmo motivo, os cards da fila do dashboard (`RECEPCAO_TRIAGEM`) apontam para a ficha do paciente, e só a visão `CLINICA` aponta para o painel do caso — link para página que redireciona de volta para `/` é beco sem saída.
- Entrega é física: a recepção imprime/entrega o link (`Paciente` não tem contato no modelo).

## Consequências
- Positivas: cidadão realmente acessa sem cadastro; revogação é um clique; equipe tem noção de uso (quantas vezes e quando); nada de senha/custo de envio para o paciente; hash em vez de token em claro reduz o impacto de vazamento do banco.
- Negativas: link vazado dá acesso até a revogação ou a expiração (30 dias); não há como saber *quem* acessou (por desenho — sem identidade do cidadão no sistema); requiere disciplina de entrega.
- `ponytail:` 1 link ativo por PTS, paciente e cuidador compartilham o mesmo link; upgrade = campo destinatário + escopo por `Cuidador` quando a recepção precisar separar acessos. Upgrade do canal de entrega = e-mail/WhatsApp quando `Paciente` tiver contato. Rate limiting de tentativas: o código tem ~50 bits e erros retornam a mesma mensagem; upgrade = bloqueio por origem se o modelo de ameaça mudar.

## Escopo adiado
Consentimento e pré-chegada do cuidador pelo portal (fora do escopo reduzido da issue #73) exigem **escrita** por cidadão anônimo — um modelo de permissão de escrita e uma revisão de LGPD próprios. Fica para um bloco posterior, com ADR própria.

## Referências
- `docs/pts-context-docs/docs/adr/0005-lock-otimista-auditoria.md` (append-only)
- `docs/pts-context-docs/docs/adr/0008-integracao-portas-multiformato.md` (falha periférica não bloqueia)
- `docs/pts-context-docs/docs/adr/0009-rbac-configuravel.md` (permissões data-driven)
- `plano/17-rbac-multi-instancia.md` §5 (catálogo de recursos)
- Código: `src/server/care-plan/portal-cidadao.ts`, `portal-cidadao-leitura.ts`, `acesso-cidadao.ts`
