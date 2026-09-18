# 18 — Componentização de UI

Convenção de trabalho (não é decisão arquitetural irreversível — não é ADR).
Nasceu de uma varredura do estado real de `src/app`/`src/components` em
2026-09-17: nenhuma tela estava absurdamente grande, mas `casos/[ptsId]/page.tsx`
misturava busca de dado, regra de negócio e markup; nenhum documento no
projeto definia onde extrair, quando quebrar um arquivo, ou como montar uma
tela nova. Este documento fixa o padrão observado (que já funcionava bem no
par `app-shell.tsx`/`sidebar.tsx`) para o resto do projeto seguir.

## 1. Regra de camada

`page.tsx` só busca dado (`db.*`) e compõe markup. Nenhuma regra de negócio
(cálculo, agregação, decisão) mora na página — vai para
`server/{contexto}/*.ts`, de preferência orquestrando funções puras já
existentes (ex.: `montarResumoCaso` em `server/care-plan/resumo-caso.ts`
orquestra `verificarConflitoMetas`, `calcularDivergencia`, `alertasDoCaso` e
`semaforoDeReuniao` — nenhuma delas foi duplicada). Isso respeita a regra de
dependência do AGENTS.md (`app → server/{contexto} → prisma`) e mantém a
lógica testável sem montar uma página inteira.

## 2. Padrão de sidebar/nav (referência para qualquer área com gate de permissão)

`src/components/app-shell.tsx` (server) decide permissão: chama
`getCurrentUser()` + `recursosDoUsuario(papelId)`, filtra os itens de nav e só
então passa a lista já filtrada para `src/components/sidebar.tsx` (client),
que é puramente apresentação — não sabe nada de RBAC. Qualquer componente
novo que precise variar por permissão do usuário segue esse split: decisão no
server component/page, apresentação "burra" no client component.

## 3. Arquivo satélite (convenção já em uso, não pasta `_components`)

Arquivos auxiliares de uma rota ficam ao lado do `page.tsx`, sem prefixo `_`,
nomeados pelo papel: `aba-*.tsx` (seção de aba), `*-form.tsx` (formulário),
`*-header.tsx` (cabeçalho/apresentação), `*-view.tsx` (visualização). Exemplo:
`src/app/casos/[ptsId]/` tem `abas.tsx`, `aba-metas.tsx`, `caso-header.tsx`,
`transicao-status-form.tsx`, etc. Não criar pasta `_components` — não é o
padrão do projeto e o Next.js App Router já ignora esses arquivos por não
exportarem `page`/`layout`/`route`.

## 4. Teto de tamanho (gatilho de revisão, não regra rígida)

Acima de ~250 linhas em `page.tsx` ou em qualquer `*.tsx` de tela é sinal de
extrair — sub-componente satélite ou lógica para `server/{contexto}`. Não é
bloqueante em lint/CI, é critério de code review.

## 5. Primitivos de UI disponíveis

`src/components/ui/` (shadcn, style `radix-nova`, `cn` sempre de
`@/lib/utils` — nunca do pacote npm `cn`, que o CLI do shadcn tenta importar
por padrão): `button`, `card`, `dropdown-menu`, `input`, `label`, `alert`,
`badge`, `toast-sucesso`, `semaforo`, `table`, `dialog`, `alert-dialog`,
`select`, `textarea`.

- **Toda listagem tabular nova** usa `Table` — não reconstruir com
  divs/cards.
- **Toda confirmação destrutiva/irreversível nova** (encerrar PTS, deletar
  papel, etc.) usa `AlertDialog` — não navegar para uma página só para
  confirmar.
- Retrofit de telas existentes que já usam divs/cards fica para quando essas
  telas forem tocadas por outro motivo — não é refatoração isolada.

## 6. Fora de escopo aqui (decisões já fixadas por ADR, não reabrir)

- ADR-0009: sidebar/menu continuam data-driven pelos recursos do usuário.
- ADR-0010: tema claro/escuro fixo, branding só via `org_config`
  (nome/logo/parceiros) — sem customização de cor por organização.

## 7. Feito (ver histórico de PRs)

- `novo-paciente-form.tsx` (590→241 linhas) e `soap-form.tsx` (350→148
  linhas): quebrados em subcomponentes por seção, padrão satélite.
- `editar-papel-form.tsx`: `confirm()` nativo (bloqueante, sem estilo,
  inacessível) trocado por `AlertDialog` na exclusão de papel.
- `dashboard/usuarios`: lista de usuários ativos trocada de divs por `Table`
  — colunas escalares (nome/e-mail/status/papel), fit natural.

**Decisão registrada**: `dashboard/papeis` e `governanca/auditoria` **não**
foram convertidos para `Table`. `papeis` é uma lista de linhas-link inteiras
(cada item navega para o detalhe) — forçar `Table` exigiria contornar a
semântica de linha clicável sem ganho real. `auditoria` tem conteúdo rico e
de tamanho variável por evento (motivo, resumo antes/depois opcionais) — não
é dado tabular, uma lista de cards continua sendo a estrutura certa. Retrofit
só faz sentido onde os dados já são colunas escalares; forçar `Table` nos
outros dois seria complexidade sem benefício (ver regra 1 da ladder: não
adicionar abstração sem necessidade real).

## 8. Próximos passos (não implementados agora)

- Avaliar `react-hook-form` nos 2 formulários grandes (zod já é dependência
  do projeto) antes de propor para os outros ~18 formulários manuais.
- `server/governance/`: agrupar/renomear `auditoria.ts` + `auditoria-resumo.ts`
  oportunisticamente, sem PR dedicado.
