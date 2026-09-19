import { ClipboardList, FileOutput, UserPlus, Workflow } from "lucide-react";

import { AdminPanel, AdminShell } from "@/components/admin/admin-shell";
import { FluxoCuidado } from "@/components/admin/fluxo-cuidado";
import { StatCard } from "@/components/admin/stat-card";
import { Semaforo } from "@/components/ui/semaforo";
import { buscarFluxoCuidado } from "@/server/care-plan/fluxo";
import { requirePermissao } from "@/server/iam/session";

const RAMOS_SEMAFORO = [
  {
    status: "vermelho" as const,
    texto: "Prioridade: entra no PTS na frente da fila.",
  },
  {
    status: "amarelo" as const,
    texto: "Fila de espera com estimativa de dias até o atendimento.",
  },
  {
    status: "verde" as const,
    texto:
      "Fora do escopo do CER: contrarreferência devolve o caso para a rede de origem.",
  },
];

export default async function FluxoPage() {
  const user = await requirePermissao("governanca.dashboard.ver");
  const { etapas, contagens } = await buscarFluxoCuidado(user.cerId);

  const ativos = (["EM_AVALIACAO", "PACTACAO", "SEGUIMENTO", "REAVALIACAO"] as const)
    .map((s) => contagens.porStatus[s] ?? 0)
    .reduce((a, b) => a + b, 0);

  return (
    <AdminShell
      titulo="Fluxo do cuidado"
      descricao="Do cadastro na recepção ao encerramento do PTS. Escolha uma etapa para ver o que acontece nela, quem atua e para onde o caso segue."
      largura="larga"
    >
      <section
        aria-label="Resumo do fluxo"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          rotulo="Pacientes cadastrados"
          valor={contagens.pacientes}
          pista="Cadastros ativos no CER"
          icon={UserPlus}
          tom="primario"
        />
        <StatCard
          rotulo="Aguardando triagem"
          valor={contagens.aguardandoTriagem}
          pista="PTS aberto sem triagem registrada"
          icon={ClipboardList}
          tom={contagens.aguardandoTriagem > 0 ? "alerta" : "neutro"}
        />
        <StatCard
          rotulo="PTS em andamento"
          valor={ativos}
          pista="Da avaliação à reavaliação"
          icon={Workflow}
          tom="primario"
        />
        <StatCard
          rotulo="Contrarreferências"
          valor={contagens.contrarreferencias}
          pista="Guias emitidas para a rede"
          icon={FileOutput}
          tom="sucesso"
        />
      </section>

      <FluxoCuidado etapas={etapas} />

      <AdminPanel
        titulo="Para onde a triagem manda o caso"
        descricao="A classificação do semáforo é o que abre ou fecha a porta do CER."
      >
        <ul className="grid gap-3 sm:grid-cols-3">
          {RAMOS_SEMAFORO.map((ramo) => (
            <li
              key={ramo.status}
              className="flex flex-col gap-2 rounded-2xl bg-surface-sunken p-4"
            >
              <Semaforo status={ramo.status} />
              <p className="text-sm text-muted-foreground">{ramo.texto}</p>
            </li>
          ))}
        </ul>
      </AdminPanel>
    </AdminShell>
  );
}
