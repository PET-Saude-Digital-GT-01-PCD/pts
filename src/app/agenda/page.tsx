import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { buscarSemanaAgenda } from "@/server/care-plan/agenda";
import { AgendaSemana } from "./agenda-semana";

function formatarData(data: Date, opcoes: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", {
    ...opcoes,
    timeZone: "America/Recife",
  }).format(data);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
  const agenda = await buscarSemanaAgenda(semana);
  if (!agenda) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <EmptyState
          icon={CalendarDays}
          titulo="Agenda indisponível para este perfil"
          descricao="Peça à administração do CER para habilitar as permissões de agenda adequadas ao seu papel."
        />
      </main>
    );
  }

  const primeiroDia = new Date(`${agenda.semana}T12:00:00-03:00`);
  const ultimoDia = new Date(`${agenda.proximaSemana}T12:00:00-03:00`);
  const tituloSemana = `${formatarData(primeiroDia, { day: "numeric", month: "long" })} – ${formatarData(new Date(ultimoDia.getTime() - 86_400_000), { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <AdminShell
      titulo="Agenda de atendimentos"
      descricao="Atendimentos do CER vinculados ao PTS e à equipe responsável. Os horários são exibidos no fuso de Recife."
      largura="larga"
      acoes={
        <div className="flex items-center gap-2" aria-label="Navegação da semana">
          <Button asChild variant="outline" size="icon" aria-label="Semana anterior">
            <Link href={`/agenda?semana=${agenda.semanaAnterior}`}><ChevronLeft aria-hidden /></Link>
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">{tituloSemana}</span>
          <Button asChild variant="outline" size="icon" aria-label="Próxima semana">
            <Link href={`/agenda?semana=${agenda.proximaSemana}`}><ChevronRight aria-hidden /></Link>
          </Button>
        </div>
      }
    >
      <AgendaSemana agenda={agenda} />
    </AdminShell>
  );
}
