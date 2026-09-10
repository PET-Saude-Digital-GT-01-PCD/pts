import { buscarIndicadores } from "@/server/governance/relatorios";
import { GovernancaViewer } from "./governanca-viewer";

export default async function GovernancaPage() {
  const painel = await buscarIndicadores();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Indicadores de governança</h1>
        <p className="text-sm text-muted-foreground">
          North Star e indicadores de entrada/saúde do piloto (plano/09).
          Cada card mostra a fonte de dado usada no cálculo.
        </p>
      </div>
      <GovernancaViewer painelInicial={painel} />
    </main>
  );
}
