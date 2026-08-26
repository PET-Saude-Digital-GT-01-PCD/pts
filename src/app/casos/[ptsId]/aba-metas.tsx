import { MetasCruzadas } from "@/components/metas-cruzadas";
import {
  verificarConflitoMetas,
  type MetaParaConflito,
} from "@/server/care-plan/conflitos";
import { listarMetas } from "@/server/care-plan/metas";
import { MetaForm } from "./meta-form";
import { MetaStatusForm } from "./meta-status-form";

export async function AbaMetas({
  ptsId,
  podeEscrever,
  donoId,
}: {
  ptsId: string;
  podeEscrever: boolean;
  donoId: string;
}) {
  const metas = await listarMetas(ptsId);
  const paraConflito: MetaParaConflito[] = metas.map((m) => ({
    id: m.id,
    ptsId,
    status: m.status,
    dataPactuacao: m.dataPactuacao,
    prazo: m.prazo,
    dominioFuncional: m.dominioFuncional,
    donoCategoria: (m.donoCategoria as MetaParaConflito["donoCategoria"]) ?? null,
  }));
  const conflitos = verificarConflitoMetas(paraConflito);

  return (
    <div className="space-y-4" data-testid="aba-metas">
      {podeEscrever && <MetaForm ptsId={ptsId} donoId={donoId} />}

      <MetasCruzadas
        metas={metas}
        conflitos={conflitos}
        acoesPorMeta={
          podeEscrever
            ? Object.fromEntries(
                metas
                  .filter(
                    (m) => m.status === "NOVA" || m.status === "EM_ANDAMENTO",
                  )
                  .map((m) => [
                    m.id,
                    <MetaStatusForm
                      key={m.id}
                      metaId={m.id}
                      status={m.status}
                      versao={m.versao}
                    />,
                  ]),
              )
            : undefined
        }
      />
    </div>
  );
}
