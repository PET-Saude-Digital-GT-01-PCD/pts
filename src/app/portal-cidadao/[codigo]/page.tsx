import type { Metadata } from "next";

import { PortalCidadaoConteudo } from "@/components/portal/portal-cidadao-conteudo";
import { buscarPortalPorCodigo } from "@/server/care-plan/portal-cidadao-leitura";

// Acesso do cidadão ao próprio PTS (ADR-0012): rota pública, sem login. O
// código no fim da URL é a credencial — quem tiver o link vê o percurso e
// as metas daquele PTS, e nada mais.

export const metadata: Metadata = {
  title: "Acompanhe seu cuidado",
};

const AVISO_ESTADO: Record<string, string> = {
  INVALIDO:
    "Não encontramos um acesso com esse código. Confira o link recebido ou peça um novo na recepção.",
  REVOGADO:
    "Este link foi substituído por um novo. Peça o link atualizado na recepção.",
  EXPIRADO:
    "Este link expirou. Peça um novo link na recepção.",
};

export default async function PortalCidadaoLinkPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const { estado, view } = await buscarPortalPorCodigo(codigo);

  if (estado !== "ATIVO" || !view) {
    return <LinkIndisponivel aviso={AVISO_ESTADO[estado] ?? AVISO_ESTADO.INVALIDO} />;
  }

  return <PortalCidadaoConteudo view={view} />;
}

function LinkIndisponivel({ aviso }: { aviso: string }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6 text-base leading-relaxed sm:p-8">
      <h1 className="text-2xl font-semibold">Não foi possível abrir seu acompanhamento</h1>
      <p data-testid="portal-cidadao-indisponivel">{aviso}</p>
      <p className="text-muted-foreground">
        Na recepção do CER a equipe gera um novo link para você, sem custo e sem cadastro.
      </p>
    </main>
  );
}
