import { listarMural } from "@/server/care-plan/mural";
import { MuralForm } from "./mural-form";

export async function AbaMural({
  ptsId,
  podeEscrever,
}: {
  ptsId: string;
  podeEscrever: boolean;
}) {
  const comentarios = await listarMural(ptsId);

  return (
    <div className="space-y-4" data-testid="aba-mural">
      {podeEscrever && <MuralForm ptsId={ptsId} />}

      {comentarios.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Mural vazio — combine ajustes assíncronos com a equipe aqui.
        </p>
      ) : (
        <ol className="space-y-3">
          {comentarios.map((c) => (
            <li key={c.id} className="rounded-lg border p-4 text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {c.autorNome}
                </span>
                <time dateTime={c.criadaEm.toISOString()}>
                  {c.criadaEm.toLocaleString("pt-BR")}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{c.texto}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
