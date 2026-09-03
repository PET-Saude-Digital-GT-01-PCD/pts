import { listarRevisoes } from "@/server/care-plan/revisao";
import { RevisaoForm } from "./revisao-form";
import { ComparativoView } from "./comparativo-view";

export async function AbaRevisoes({
  ptsId,
  podeEscrever,
}: {
  ptsId: string;
  podeEscrever: boolean;
}) {
  const revisoes = await listarRevisoes(ptsId);

  return (
    <div className="space-y-6" data-testid="aba-revisoes">
      {podeEscrever && <RevisaoForm ptsId={ptsId} />}

      <div>
        <h3 className="mb-2 text-md font-medium">Marcos registrados</h3>
        {revisoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma revisão registrada ainda.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="lista-revisoes">
            {revisoes.map((r) => (
              <li key={r.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  Revisão #{r.numero} — {r.data.toLocaleDateString("pt-BR")}
                </p>
                <p className="text-muted-foreground">
                  {r.motivo} · {r.revisorNome}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-md font-medium">Comparativo entre marcos</h3>
        <ComparativoView ptsId={ptsId} revisoes={revisoes} />
      </div>
    </div>
  );
}
