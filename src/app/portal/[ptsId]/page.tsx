import { PortalCidadaoConteudo } from "@/components/portal/portal-cidadao-conteudo";
import { buscarPortalCidadao } from "@/server/care-plan/portal";

export default async function PortalCidadaoPage({
  params,
}: {
  params: Promise<{ ptsId: string }>;
}) {
  const { ptsId } = await params;
  const view = await buscarPortalCidadao(ptsId);
  return <PortalCidadaoConteudo view={view} />;
}
