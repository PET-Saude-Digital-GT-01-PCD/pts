# 06 — Refatoração de UI/UX (branch `refactor/22-ui-ux-pts`)

Resumo para code review. Escopo: padronização de tokens, primitivos de UI e
revisão das telas do PTS com foco em mobile-first, acessibilidade e estados de
interface. **Paleta e identidade visual não mudaram** — só passaram a ser usadas
de forma consistente, via token, no lugar de cores soltas do Tailwind.

## 1. Tokens (`src/app/globals.css`)

- A escala de raio virou `--radius` em `:root` e é derivada dentro de
  `@theme inline` (`--radius-xs` … `--radius-xl`). Antes ela ficava fora do
  `@theme`, então `rounded-md`/`rounded-lg` **não** enxergavam os valores do
  projeto; agora os utilitários e o `var(--radius-*)` usado nos componentes
  apontam para a mesma fonte.
- Novos tokens `--success-foreground` e `--warning-foreground` (claro e escuro),
  mapeados em `@theme inline` junto com os que já existiam.
- Nenhuma cor de marca foi alterada.

## 2. Primitivos (`src/components/ui`)

| Componente | Mudança |
|---|---|
| `button.tsx` | prop `loading`: spinner Lucide, `aria-busy`, desabilita sozinho. Alturas maiores no mobile (`h-9 md:h-8`) para alvo de toque. `text-[0.8rem]` virou `text-xs`. |
| `input.tsx` | mesmo raio, altura, fundo no escuro e anel de erro do `Textarea`/`Select`. `text-base` no mobile evita o zoom automático do iOS. |
| `select.tsx` | alturas de toque no mobile. |
| `badge.tsx` | variantes `success` e `warning`; `importado` deixou de usar emerald fixo; foco passou a `focus-visible` como no resto. |
| `alert.tsx` | variantes `warning` e `success` por token, sem amber fixo. |
| `toast-sucesso.tsx` | `role="status"` + `aria-live="polite"`, `aria-label` no botão fechar, largura total no mobile, cores por token. |
| `skeleton.tsx` *(novo)* | bloco de carregamento, respeita `prefers-reduced-motion`. |
| `empty-state.tsx` *(novo)* | estado vazio padrão: ícone, título, descrição e ação. |
| `form-field.tsx` *(novo)* | liga label, dica e erro ao controle por `aria-describedby`/`aria-invalid`, com `role="alert"` no erro. |

`lib/utils.ts` ganhou `campoNativoClasses`: os `<select>` nativos espalhados pelo
app agora usam a mesma string em vez de dez cópias divergentes de
`rounded-md border px-3 text-sm`. Textareas usam o primitivo `Textarea`. O
`<select>` continua nativo de propósito: picker do sistema no mobile e
`selectOption` direto nos e2e.

## 3. PTS (`src/app/casos/[ptsId]`)

- `error.tsx` e `not-found.tsx` novos: o caso ganhou tela de erro com botão de
  nova tentativa e tela de caso inexistente, em vez de tela branca.
- Carregamento progressivo por aba: cada aba é renderizada dentro de um
  `Suspense` com esqueleto. **Não use `loading.tsx` neste segmento** — ele liga
  o streaming da rota inteira, e aí o `notFound()` do PTS inexistente responde
  200 em vez de 404 (`e2e/casos.spec.ts:66` cobre isso).
- `caso-header.tsx`: hierarquia refeita. Nome, status e semáforo numa linha;
  alertas (falta recente, PTS fechado, sugestão de revisão) empilhados abaixo
  como `Alert`. Título menor no mobile.
- `abas.tsx`: rolagem horizontal no mobile, indicador na aba ativa,
  `aria-current` e anel de foco visível.
- Formulários (`mural-form`, `meta-form`, `meta-status-form`, `evento-form`,
  `revisao-form`, `triagem-form`, `transicao-status-form`): controles crus
  trocados por `Input`/`Textarea`/`FormField`, erro ligado ao campo, botão de
  envio com `loading`, ações empilhadas no mobile.
- `metas-cruzadas.tsx`: pílulas manuais viraram `Badge`; lista vazia virou
  `EmptyState`.
- Estados vazios de metas, revisões, mural, avaliações, triagem, timeline e
  recepção passaram a usar `EmptyState`.
- Timeline do caso empilha data e descrição no mobile.

## 4. Fora do PTS, pelo mesmo motivo

- Todas as ocorrências de `emerald-*` e `amber-*` foram trocadas pelos tokens
  `success`/`warning` (portal do cidadão, triagem, recepção, dashboard,
  governança).
- Botões de envio que usavam `disabled={pending}` passaram a `loading={pending}`
  (16 ocorrências).
- `<main>` com `p-8` virou `p-4 sm:p-8`: 32px de margem lateral em tela de
  375px desperdiçava metade da largura útil.
- `sidebar.tsx`: `<nav>` rotulado, `aria-current` no item ativo, foco visível,
  e o botão sair passou a usar `Button`.

## 5. Cuidados registrados

1. `Button` com `asChild` precisa entregar **um único filho** ao `Slot` do
   Radix. O spinner do `loading` só é renderizado quando `asChild` é falso; há
   teste cobrindo isso em `tests/ui/primitivos.test.tsx`.
2. `loading.tsx` no segmento do caso quebra o status 404 (ver seção 3).
3. O menu lateral usa `aria-label="Menu principal"`. Com "Navegação principal",
   o `getByLabel("Ação")` do e2e de auditoria casava também com o `<nav>`, já
   que "Navegação" contém "ação" e o seletor faz busca por substring.

## 6. Verificação

- `pnpm typecheck`, `pnpm lint`, `pnpm build`: limpos.
- `pnpm test`: 408 testes passando (com o banco de dev de pé), incluindo 17 de UI.
- `pnpm e2e`: comparado em série (`--workers=1`, como no CI) contra `develop`,
  com banco semeado antes de cada rodada. As falhas restantes são as mesmas nas
  duas branches; elas vêm de estado compartilhado do seed entre specs e já
  existiam. Atenção: `pnpm e2e` **não** faz build, e `reuseExistingServer` está
  ligado, então rode `pnpm build` antes ou você testa o bundle anterior.
- Manual sugerido no review: 375px e 1280px, tema claro e escuro, navegação só
  por teclado e um formulário com erro num leitor de tela.
