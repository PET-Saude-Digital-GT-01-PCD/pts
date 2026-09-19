import { AdminShell } from "@/components/admin/admin-shell";
import { buscarIndicadores } from "@/server/governance/relatorios";
import { GovernancaViewer } from "./governanca-viewer";

export default async function GovernancaPage() {
  const painel = await buscarIndicadores();

  return (
    <AdminShell
      titulo="Indicadores de governança"
      descricao="North Star e indicadores de entrada/saúde do piloto (plano/09). Cada card mostra a fonte de dado usada no cálculo."
      largura="larga"
    >
      <GovernancaViewer painelInicial={painel} />
    </AdminShell>
  );
}
