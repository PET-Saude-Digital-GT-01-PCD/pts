import Link from "next/link";

import { listarCasosParaEquipe } from "@/server/care-plan/equipe";

const STATUS_LABEL: Record<string, string> = {
  EM_AVALIACAO: "Em avaliação",
  PACTACAO: "Pactuação",
  SEGUIMENTO: "Seguimento",
  REAVALIACAO: "Reavaliação",
};

export default async function CasosParaEquipePage() {
  const casos = await listarCasosParaEquipe();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Equipes dos casos</h1>
        <p className="text-sm text-muted-foreground">
          Vincule profissionais aos casos ativos do CER. Sem acesso ao
          conteúdo clínico — apenas gerenciamento de equipe.
        </p>
      </div>

      {casos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhum caso ativo no CER ainda.
        </div>
      ) : (
        <div className="divide-y rounded-md border" data-testid="lista-casos-equipe">
          {casos.map((c) => (
            <Link
              key={c.ptsId}
              href={`/dashboard/casos/${c.ptsId}/equipe`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent"
            >
              <div>
                <p className="font-medium">{c.pacienteNome}</p>
                <p className="text-xs text-muted-foreground">
                  {STATUS_LABEL[c.status] ?? c.status} · Referência:{" "}
                  {c.refProfissionalNome ?? "—"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {c.totalEquipe} na equipe
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
