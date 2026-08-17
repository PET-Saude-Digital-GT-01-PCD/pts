# ADR-0010: Multi-instância per-org + OrgConfig (branding por URL)

## Status
Aceito

## Contexto
A plataforma é distribuída para que cada organização rode sua própria instância (deploy-per-org, `docker compose`), não como SaaS. Cada org adapta o sistema ao seu contexto (perfis, permissões, campos de cadastro). Para identidade visual, a org precisa exibir seu nome, logo e parceiros — mas o tema claro/escuro permanece o padrão PTS, sem configuração de cores.

## Decisão
- **Deploy-per-org**: app distribuída via imagem Docker (ADR-0007); cada organização sobe a própria instância e configura via UI. Não há multi-tenant SaaS, logo não há RLS por org nem switching de tenant.
- **`org_config`** (1:1 com `cer`, tabela separada para não alterar a entidade de identidade): `nomeExibido`, `logoUrl`, `parceirosJson` (`[{ nome, logoUrl }]`).
- **Branding por URL apenas** (sem upload de arquivo por enquanto): `layout.tsx` lê `org_config`, renderiza nome/logo no header e parceiros no rodapé; `generateMetadata` dinâmico (título = org).
- **Tema claro/escuro fixo** — tokens em `globals.css` inalterados. Nenhuma injeção de CSS vars a partir de configuração (evita vetor de CSS arbitrário).
- Admin edita nome/logo/parceiros em tela própria (recurso `config.org.editar`, base `ADMIN`).

## Consequências
- Positivas: org sem equipe técnica customiza identidade via UI; sem storage de upload; tema acessível e consistente; `cer` permanece estável.
- Negativas: logo depende de URL acessível publicamente; org que quiser mais identidade visual edita o tema no código-fonte (instância própria).
- `ponytail:` branding só por URL; upgrade = upload de logo (requer storage + serving) quando orgs pedirem. Tema custom por org só se deploy virar SaaS — aí revisitar com RLS + CSS vars por tenant.