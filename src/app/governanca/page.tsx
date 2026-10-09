import { AdminShell } from "@/components/admin/admin-shell";
import { buscarIndicadores } from "@/server/governance/relatorios";
import { GovernancaViewer } from "./governanca-viewer";

export default async function GovernancaPage() {
  const painel = await buscarIndicadores();

  return (
    <AdminShell
      titulo="Indicadores de governança"
      descricao="Acompanhe os indicadores de cuidado do CER, escolha o período e a janela de revisão e exporte os valores exibidos. Cada indicador apresenta seu cálculo, fonte e alcance temporal."
      largura="larga"
    >
      <GovernancaViewer painelInicial={painel} />
    </AdminShell>
  );
}
