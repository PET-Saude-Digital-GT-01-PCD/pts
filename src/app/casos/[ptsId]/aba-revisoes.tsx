import { listarRevisoes } from "@/server/care-plan/revisao";
import { RevisaoForm } from "./revisao-form";
import { ComparativoView } from "./comparativo-view";
import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

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
        <h3 className="mb-2 text-base font-medium">Marcos registrados</h3>
        {revisoes.length === 0 ? (
          <EmptyState
            icon={History}
            titulo="Nenhuma revisão registrada"
            descricao="Cada reavaliação do PTS vira um marco aqui, com data e motivo."
          />
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
        <h3 className="mb-2 text-base font-medium">Comparativo entre marcos</h3>
        <ComparativoView ptsId={ptsId} revisoes={revisoes} />
      </div>
    </div>
  );
}
