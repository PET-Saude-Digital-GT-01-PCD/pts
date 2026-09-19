import Link from "next/link";
import { Users } from "lucide-react";

import { AdminPanel, AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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
    <AdminShell
      titulo="Equipes dos casos"
      descricao="Vincule profissionais aos casos ativos do CER. Sem acesso ao conteúdo clínico — apenas gerenciamento de equipe."
    >
      {casos.length === 0 ? (
        <EmptyState
          icon={Users}
          titulo="Nenhum caso ativo no CER ainda"
          descricao="Os casos aparecem aqui assim que a triagem abrir o primeiro PTS."
        />
      ) : (
        <AdminPanel titulo={`Casos ativos (${casos.length})`}>
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="lista-casos-equipe">
            {casos.map((c) => (
              <li key={c.ptsId}>
                <Link
                  href={`/dashboard/casos/${c.ptsId}/equipe`}
                  className="flex h-full flex-col gap-2 rounded-2xl bg-surface-sunken p-4 transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.pacienteNome}</span>
                    <Badge variant="secondary">
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Referência: {c.refProfissionalNome ?? "—"}
                  </span>
                  <span className="mt-auto text-xs text-muted-foreground tabular-nums">
                    {c.totalEquipe} na equipe
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}
    </AdminShell>
  );
}
