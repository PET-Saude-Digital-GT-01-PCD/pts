import { listarAvaliacoesSoap } from "@/server/clinical/soap";
import {
  listarAvaliacoesEspecialidade,
} from "@/server/clinical/avaliacao-especialidade";
import { especialidadesDoUsuario } from "@/server/clinical/cif";
import { getCurrentUser } from "@/server/iam/session";
import {
  calcularDivergencia,
  type EntradaAvaliacao,
  type EntradaRelato,
  type GrauDivergencia,
} from "@/server/clinical/divergencia";
import { SoapForm } from "./soap-form";
import { ChecklistCifForm } from "./checklist-cif-form";

type ItemGrade = {
  servico: string;
  frequencia: string;
  duracao: string;
  justificativa: string;
};

type EscoresSoap = {
  ashworth?: { total: number; media: number | null; gruposAvaliados: number } | null;
  glasgow?: { total: number | null; completo: boolean } | null;
};

function itensGrade(v: unknown): ItemGrade[] {
  if (typeof v !== "object" || v === null) return [];
  const plano = (v as { plano?: unknown }).plano;
  const grade = (plano as { gradeServicos?: unknown } | null)?.gradeServicos;
  return Array.isArray(grade) ? (grade as ItemGrade[]) : [];
}

const ROTULOS_DIVERGENCIA: Record<string, string> = {
  mobilidadeRelatada_vs_mobilidadeMedida: "Mobilidade",
  expectativaRecuperacao_vs_prognosticoClinico: "Expectativa × prognóstico",
  autonomiaRelatada_vs_autonomiaObservada: "Autonomia",
};

const CLASSE_GRAU: Record<GrauDivergencia, string> = {
  ALTA: "border-destructive/40 bg-destructive/10 text-destructive",
  MEDIA: "border-warning/40 bg-warning/10 text-warning",
  BAIXA: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  NENHUMA: "border-border bg-muted text-muted-foreground",
};

export function PainelDivergencia({
  dadosJson,
}: {
  dadosJson: unknown;
}) {
  const dados = (dadosJson ?? {}) as Record<string, unknown>;
  const itens = calcularDivergencia(
    (dados.relato ?? {}) as EntradaRelato,
    (dados.avaliacaoClinica ?? {}) as EntradaAvaliacao,
  );
  // Direcional: nunca bloqueia, só contrasta. Inline = 0 cliques da aba.
  return (
    <div
      data-testid="painel-divergencia"
      className="mt-2 flex flex-wrap gap-2 border-t pt-2"
      aria-label="Painel de divergência saudável"
    >
      {itens.length === 0 ? (
        <span className="text-xs text-muted-foreground">
          Sem pares relato × avaliação preenchidos.
        </span>
      ) : (
        itens.map((d) => (
          <span
            key={d.item}
            data-testid={`divergencia-${d.grau.toLowerCase()}`}
            title={`Relato ${d.relato} × avaliação ${d.avaliacao}`}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${CLASSE_GRAU[d.grau]}`}
          >
            {ROTULOS_DIVERGENCIA[d.item] ?? d.item}: {d.grau}
          </span>
        ))
      )}
    </div>
  );
}

export async function AbaAvaliacoes({ ptsId }: { ptsId: string }) {
  const lista = await listarAvaliacoesSoap(ptsId);
  const avaliacoes = lista.ok ? lista.avaliacoes : [];

  // RF-UX-3: cada papel vê só a sua especialidade (FISIO/TO)
  const user = await getCurrentUser();
  const escopos = especialidadesDoUsuario(user?.categoria);
  const listaEsp = await listarAvaliacoesEspecialidade(ptsId);
  const avaliacoesEspecialidade = listaEsp.ok ? listaEsp.avaliacoes : [];

  return (
    <div className="space-y-8">
      {escopos.map((esp) => (
        <section key={esp} aria-label={`Nova avaliação ${esp}`} className="space-y-4">
          <h3 className="text-md font-medium">
            Nova avaliação — {esp === "FISIO" ? "Fisioterapia" : "Terapia Ocupacional"}
          </h3>
          <ChecklistCifForm ptsId={ptsId} especialidade={esp} />
        </section>
      ))}

      <section aria-label="Nova avaliação SOAP" className="space-y-4">
        <h3 className="text-md font-medium">Nova avaliação SOAP</h3>
        <SoapForm ptsId={ptsId} />
      </section>

      <section aria-label="Avaliações registradas" className="space-y-3" data-testid="lista-soap">
        <h3 className="text-md font-medium">Avaliações registradas</h3>
        {avaliacoesEspecialidade.length > 0 && (
          <ul className="space-y-3" data-testid="lista-especialidade">
            {avaliacoesEspecialidade.map((a) => {
              const dados = a.dadosJson as Record<string, unknown>;
              const escores = (a.escoresJson as { cif?: string[] } | null) ?? {};
              return (
                <li key={a.id} className="rounded-lg border p-4 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {a.especialidade} ·{" "}
                    {a.criadaEm.toLocaleDateString("pt-BR")} · {a.avaliadorNome} ·
                    versão {a.versao}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(escores.cif ?? []).map((codigo) => (
                      <span
                        key={codigo}
                        className="rounded-full border border-sky-500/40 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                      >
                        CIF {codigo}
                      </span>
                    ))}
                    {(escores.cif ?? []).length === 0 && (
                      <span className="text-muted-foreground text-xs">
                        Nenhum código CIF gerado.
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Itens marcados:{" "}
                    {Object.entries(dados)
                      .filter(([, v]) => v === true)
                      .map(([k]) => k)
                      .join(", ") || "nenhum"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {avaliacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma avaliação SOAP ainda.</p>
        ) : (
          <ul className="space-y-3">
            {avaliacoes.map((a) => {
              const dados = a.dadosJson as Record<string, unknown>;
              const grade = itensGrade(a.dadosJson);
              const escores = (a.escoresJson ?? null) as EscoresSoap | null;
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
                  {(escores?.ashworth || escores?.glasgow?.completo) && (
                    <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
                      {escores.ashworth && (
                        <span className="rounded-full border border-violet-500/40 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                          Ashworth: total {escores.ashworth.total} (
                          {escores.ashworth.gruposAvaliados} grupo(s))
                        </span>
                      )}
                      {escores.glasgow?.completo && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Glasgow: {escores.glasgow.total}/15
                        </span>
                      )}
                    </div>
                  )}
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
                  <PainelDivergencia dadosJson={a.dadosJson} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
