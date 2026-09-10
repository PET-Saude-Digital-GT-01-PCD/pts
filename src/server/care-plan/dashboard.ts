import { db } from "@/lib/db";
import type { StatusMeta, StatusPts, Semaforo } from "@prisma/client";
import { buscarFilaAmarela } from "@/server/triage/fila-espera";

// ===== Partes puras (testáveis sem I/O) =====

export type VisaoPapel = "CLINICA" | "RECEPCAO_TRIAGEM" | "GESTAO";

export function visaoPorRecursos(recursos: string[]): VisaoPapel | null {
  if (recursos.includes("governanca.dashboard.ver")) return "GESTAO";
  const clinico = recursos.some(
    (r) => r.startsWith("care-plan.") || r.startsWith("clinical."),
  );
  if (clinico) return "CLINICA";
  const recepcaoTriagem = recursos.some(
    (r) => r.startsWith("recepcao.") || r.startsWith("triage."),
  );
  if (recepcaoTriagem) return "RECEPCAO_TRIAGEM";
  return null;
}

export type MetaResumo = { prazo: Date; status: StatusMeta };

const DIA_MS = 24 * 60 * 60 * 1000;
const META_ATIVA: StatusMeta[] = ["NOVA", "EM_ANDAMENTO"];

export function alertasDoCaso(
  pts: { status: StatusPts; aberturaEm: Date },
  metas: MetaResumo[],
  agora: Date,
): string[] {
  const alertas: string[] = [];
  const vencidas = metas.filter(
    (m) => META_ATIVA.includes(m.status) && m.prazo.getTime() < agora.getTime(),
  );
  if (vencidas.length === 1) alertas.push("1 meta com prazo vencido");
  if (vencidas.length > 1) alertas.push(`${vencidas.length} metas com prazo vencido`);
  const diasAberto = Math.floor((agora.getTime() - pts.aberturaEm.getTime()) / DIA_MS);
  if (pts.status !== "FECHADO" && pts.status === "EM_AVALIACAO" && diasAberto > 60) {
    alertas.push("Aberto há mais de 60 dias em avaliação");
  }
  return alertas;
}

// ===== Query por papel =====

export type SessaoBasica = { id: string; cerId: string | null };

export type CardCaso = {
  ptsId: string;
  pacienteNome: string;
  statusPts: StatusPts;
  semaforo: Semaforo;
  alertas: string[];
};

export type ResumoFilaAmarela = {
  total: number;
  proximaEstimativaDias: number | null;
};

export type VisaoDashboard =
  | { visao: "CLINICA"; casos: CardCaso[] }
  | { visao: "RECEPCAO_TRIAGEM"; casos: CardCaso[]; filaAmarela: ResumoFilaAmarela }
  | {
      visao: "GESTAO";
      agregados: {
        total: number;
        porStatus: Record<string, number>;
        porSemaforo: Record<string, number>;
      };
    };

export async function queryCasosPorPapel(
  usuario: SessaoBasica,
  recursos: string[],
  agora: Date = new Date(),
): Promise<VisaoDashboard | null> {
  const visao = visaoPorRecursos(recursos);
  if (visao === null) return null;

  if (visao === "GESTAO") {
    const [porStatus, porSemaforo] = await Promise.all([
      db.pts.groupBy({
        by: ["status"],
        where: { cerId: usuario.cerId ?? undefined },
        _count: { _all: true },
      }),
      db.pts.groupBy({
        by: ["semaforoReuniao"],
        where: { cerId: usuario.cerId ?? undefined },
        _count: { _all: true },
      }),
    ]);
    return {
      visao: "GESTAO",
      agregados: {
        total: porStatus.reduce((acc, g) => acc + g._count._all, 0),
        porStatus: Object.fromEntries(
          porStatus.map((g) => [g.status, g._count._all]),
        ),
        porSemaforo: Object.fromEntries(
          porSemaforo.map((g) => [g.semaforoReuniao, g._count._all]),
        ),
      },
    };
  }

  if (visao === "RECEPCAO_TRIAGEM") {
    const inicioDia = new Date(agora);
    inicioDia.setHours(0, 0, 0, 0);
    const [ptsHoje, filaAmarela] = await Promise.all([
      db.pts.findMany({
        where: {
          cerId: usuario.cerId ?? undefined,
          criadoEm: { gte: inicioDia },
        },
        select: {
          id: true,
          status: true,
          aberturaEm: true,
          semaforoReuniao: true,
          paciente: { select: { nome: true } },
          triagens: { select: { classificacao: true }, orderBy: { criadaEm: "desc" }, take: 1 },
        },
        orderBy: { criadoEm: "desc" },
        take: 50,
      }),
      usuario.cerId ? buscarFilaAmarela(usuario.cerId) : Promise.resolve([]),
    ]);
    return {
      visao: "RECEPCAO_TRIAGEM",
      casos: ptsHoje.map((p) => ({
        ptsId: p.id,
        pacienteNome: p.paciente.nome,
        statusPts: p.status,
        semaforo: p.triagens[0]?.classificacao ?? p.semaforoReuniao,
        alertas: [],
      })),
      filaAmarela: {
        total: filaAmarela.length,
        proximaEstimativaDias: filaAmarela[0]?.estimativaDias ?? null,
      },
    };
  }

  const meusPts = await db.pts.findMany({
    where: {
      OR: [
        { refProfissionalId: usuario.id },
        { equipePts: { some: { usuarioId: usuario.id } } },
      ],
    },
    select: {
      id: true,
      status: true,
      aberturaEm: true,
      semaforoReuniao: true,
      paciente: { select: { nome: true } },
      metas: { select: { prazo: true, status: true } },
    },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });
  return {
    visao: "CLINICA",
    casos: meusPts.map((p) => ({
      ptsId: p.id,
      pacienteNome: p.paciente.nome,
      statusPts: p.status,
      semaforo: p.semaforoReuniao,
      alertas: alertasDoCaso(p, p.metas, agora),
    })),
  };
}
