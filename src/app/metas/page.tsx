import Link from "next/link";
import { redirect } from "next/navigation";

import { MetasCruzadas } from "@/components/metas-cruzadas";
import { temUmaDas } from "@/server/care-plan/acesso";
import {
  verificarConflitoMetas,
  type MetaParaConflito,
} from "@/server/care-plan/conflitos";
import { listarMetas } from "@/server/care-plan/metas";

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ ptsId?: string }>;
}) {
  if (!(await temUmaDas(["care-plan.meta.ler"]))) redirect("/");

  const { ptsId } = await searchParams;
  if (!ptsId) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Metas do caso</h1>
        <p className="text-sm text-muted-foreground">
          Informe o caso: <code>/metas?ptsId=…</code>
        </p>
      </main>
    );
  }

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
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Metas do caso — painel cruzado</h1>
        <Link
          href={`/casos/${ptsId}?aba=metas`}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Voltar ao painel
        </Link>
      </header>
      <MetasCruzadas metas={metas} conflitos={conflitos} />
    </main>
  );
}
