import { listarAvaliacoesSoap } from "@/server/clinical/soap";
import { SoapForm } from "./soap-form";

type ItemGrade = {
  servico: string;
  frequencia: string;
  duracao: string;
  justificativa: string;
};

function itensGrade(v: unknown): ItemGrade[] {
  if (typeof v !== "object" || v === null) return [];
  const plano = (v as { plano?: unknown }).plano;
  const grade = (plano as { gradeServicos?: unknown } | null)?.gradeServicos;
  return Array.isArray(grade) ? (grade as ItemGrade[]) : [];
}

export async function AbaAvaliacoes({ ptsId }: { ptsId: string }) {
  const lista = await listarAvaliacoesSoap(ptsId);
  const avaliacoes = lista.ok ? lista.avaliacoes : [];

  return (
    <div className="space-y-8">
      <section aria-label="Nova avaliação SOAP" className="space-y-4">
        <h3 className="text-md font-medium">Nova avaliação SOAP</h3>
        <SoapForm ptsId={ptsId} />
      </section>

      <section aria-label="Avaliações registradas" className="space-y-3" data-testid="lista-soap">
        <h3 className="text-md font-medium">Avaliações registradas</h3>
        {avaliacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma avaliação SOAP ainda.</p>
        ) : (
          <ul className="space-y-3">
            {avaliacoes.map((a) => {
              const dados = a.dadosJson as Record<string, unknown>;
              const grade = itensGrade(a.dadosJson);
              return (
                <li key={a.id} className="rounded-lg border p-4 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {a.criadaEm.toLocaleDateString("pt-BR")} · {a.avaliadorNome} · versão{" "}
                    {a.versao}
                  </p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {(["subjetivo", "objetivo", "avaliacao"] as const).map((campo) => (
                      <div key={campo}>
                        <p className="font-medium">{campo[0].toUpperCase() + campo.slice(1)}</p>
                        <p className="whitespace-pre-line text-muted-foreground">
                          {String(dados[campo] ?? "—")}
                        </p>
                      </div>
                    ))}
                  </div>
                  {grade.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t pt-2">
                      {grade.map((item, i) => (
                        <li key={i}>
                          <span className="font-medium">{item.servico}</span>{" "}
                          <span className="text-muted-foreground">
                            {item.frequencia} · {item.duracao}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
