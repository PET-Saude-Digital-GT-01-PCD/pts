import { notFound } from "next/navigation";

import { buscarContrarreferencia } from "@/server/triage/contrarreferencia";
import { ImprimirBotao } from "@/components/imprimir-botao";

export default async function ContrarreferenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guia = await buscarContrarreferencia(id);
  if (!guia) notFound();

  const plano = (guia.planoCuidadosJson as { texto?: string } | null)?.texto;

  return (
    <main
      className="mx-auto w-full max-w-2xl space-y-6 p-8 print:p-0"
      data-testid="guia-contrarreferencia-resumo"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Guia de contrarreferência</h1>
          <p className="text-sm text-muted-foreground">
            Emitida em {guia.criadaEm.toLocaleString("pt-BR")} por{" "}
            {guia.emitidaPorNome}
          </p>
        </div>
        <ImprimirBotao />
      </header>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="font-medium">Paciente</dt>
          <dd>{guia.pacienteNome}</dd>
        </div>
        {guia.destinoUbs && (
          <div>
            <dt className="font-medium">Destino (UBS/APS)</dt>
            <dd>{guia.destinoUbs}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium">Motivo / justificativa</dt>
          <dd className="whitespace-pre-wrap">{guia.motivo}</dd>
        </div>
        {plano && (
          <div>
            <dt className="font-medium">Plano de cuidados à APS</dt>
            <dd className="whitespace-pre-wrap">{plano}</dd>
          </div>
        )}
      </dl>
    </main>
  );
}
