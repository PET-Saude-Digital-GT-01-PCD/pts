"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { buscarFilaAmarela } from "@/server/triage/fila-espera";
import { assertPtsMutavel } from "@/server/care-plan/acesso";
import { recursosDoUsuario, requireAuth } from "@/server/iam/session";
import {
  dataCivilBrasilia,
  horariosSeSobrepoem,
  intervaloSemanaAgenda,
  somarDiasCivis,
} from "@/server/care-plan/agenda-utils";

const DURACOES = [15, 30, 45, 60, 90, 120] as const;
const HORA_MINIMA_FUTURA_MS = 2 * 60 * 1000;

const uuid = z.string().uuid();
const novoAgendamentoSchema = z.object({
  ptsId: uuid,
  profissionalId: uuid,
  inicioEm: z.string().datetime({ offset: true }),
  duracaoMinutos: z.coerce.number().int().refine((v) => DURACOES.includes(v as (typeof DURACOES)[number])),
});
const reagendarSchema = z.object({
  agendamentoId: uuid,
  inicioEm: z.string().datetime({ offset: true }),
});
const cancelarSchema = z.object({
  agendamentoId: uuid,
  motivo: z.string().trim().min(3, "Informe o motivo do cancelamento.").max(500),
});
const registrarSchema = z.object({
  agendamentoId: uuid,
  resultado: z.enum(["REALIZADO", "FALTA"]),
  observacao: z.string().trim().max(500).optional(),
});

type Resultado = { ok: true; agendamentoId?: string } | { ok: false; erro: string };

function erroPrisma(e: unknown): string | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2034") return "A agenda foi atualizada em paralelo. Atualize a página e tente novamente.";
  }
  return null;
}

async function bloquearAgendaProfissional(
  tx: Prisma.TransactionClient,
  profissionalId: string,
) {
  const chaveLock = `agenda:${profissionalId}`;
  await tx.$queryRaw<Array<{ locked: number }>>`
    WITH lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtextextended(${chaveLock}, 0))
    )
    SELECT 1::int AS locked FROM lock
  `;
}

async function verificarAcessoAoCaso(
  ptsId: string,
  cerId: string,
  usuarioId: string,
  gerenteAgenda: boolean,
  tx: Prisma.TransactionClient,
) {
  const pts = await tx.pts.findFirst({
    where: { id: ptsId, cerId, status: { not: "FECHADO" } },
    select: {
      id: true,
      refProfissionalId: true,
      equipePts: { select: { usuarioId: true } },
    },
  });
  if (!pts) throw new Error("PTS não encontrado ou encerrado.");
  if (
    !gerenteAgenda &&
    pts.refProfissionalId !== usuarioId &&
    !pts.equipePts.some((m) => m.usuarioId === usuarioId)
  ) {
    throw new Error("Você não está vinculado à equipe deste caso.");
  }
  return pts;
}

async function verificarDisponibilidade(
  tx: Prisma.TransactionClient,
  profissionalId: string,
  inicioEm: Date,
  fimEm: Date,
  excluirId?: string,
) {
  await bloquearAgendaProfissional(tx, profissionalId);
  const candidatos = await tx.agendamento.findMany({
    where: {
      profissionalId,
      status: "AGENDADO",
      inicioEm: { lt: fimEm },
      fimEm: { gt: inicioEm },
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    select: { inicioEm: true, fimEm: true },
  });
  if (candidatos.some((item) => horariosSeSobrepoem(inicioEm, fimEm, item))) {
    throw new Error("Este profissional já tem um atendimento nesse horário.");
  }
}

export async function buscarSemanaAgenda(dataReferencia?: string) {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!recursos.includes("agenda.atendimentos.ver")) return null;
  if (!user.cerId) return null;

  const referencia = dataReferencia ?? dataCivilBrasilia(new Date());
  const intervalo = intervaloSemanaAgenda(referencia);
  const gerenteAgenda = recursos.includes("agenda.atendimentos.gerenciar");
  const podeAgendar = recursos.includes("agenda.atendimentos.agendar");
  const podeRegistrar = recursos.includes("agenda.atendimentos.registrar");

  const [agendamentos, casos, fila] = await Promise.all([
    db.agendamento.findMany({
      where: {
        pts: {
          cerId: user.cerId,
          ...(gerenteAgenda
            ? {}
            : {
                OR: [
                  { refProfissionalId: user.id },
                  { equipePts: { some: { usuarioId: user.id } } },
                ],
              }),
        },
        inicioEm: { gte: intervalo.inicio, lt: intervalo.fim },
      },
      orderBy: [{ inicioEm: "asc" }, { profissional: { nome: "asc" } }],
      select: {
        id: true,
        ptsId: true,
        inicioEm: true,
        fimEm: true,
        status: true,
        remarcadoDeId: true,
        profissionalId: true,
        profissional: { select: { nome: true, categoria: true } },
        pts: {
          select: {
            semaforoReuniao: true,
            paciente: { select: { nome: true } },
            eventos: {
              orderBy: { data: "desc" },
              take: 1,
              select: { tipo: true, data: true },
            },
          },
        },
      },
    }),
    podeAgendar
      ? db.pts.findMany({
          where: {
            cerId: user.cerId,
            status: { not: "FECHADO" },
            ...(gerenteAgenda
              ? {}
              : {
                  OR: [
                    { refProfissionalId: user.id },
                    { equipePts: { some: { usuarioId: user.id } } },
                  ],
                }),
          },
          orderBy: { paciente: { nome: "asc" } },
          select: {
            id: true,
            status: true,
            semaforoReuniao: true,
            paciente: { select: { nome: true } },
            refProfissional: {
              select: { id: true, nome: true, categoria: true, status: true },
            },
            equipePts: {
              orderBy: { usuario: { nome: "asc" } },
              select: {
                usuario: { select: { id: true, nome: true, categoria: true, status: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    buscarFilaAmarela(user.cerId),
  ]);

  const posicoesFila = new Map(fila.map((item) => [item.ptsId, item]));
  const dadosCasos = casos.map((caso) => {
    const profissionais = [
      ...(caso.refProfissional && caso.refProfissional.status === "ATIVO"
        ? [caso.refProfissional]
        : []),
      ...caso.equipePts.map((m) => m.usuario).filter((p) => p.status === "ATIVO"),
    ];
    return {
      ptsId: caso.id,
      pacienteNome: caso.paciente.nome,
      status: caso.status,
      semaforoReuniao: caso.semaforoReuniao,
      profissionais: profissionais.filter(
        (p, index, todos) => todos.findIndex((outro) => outro.id === p.id) === index,
      ),
    };
  });

  return {
    semana: intervalo.primeiroDia,
    proximaSemana: somarDiasCivis(intervalo.primeiroDia, 7),
    semanaAnterior: somarDiasCivis(intervalo.primeiroDia, -7),
    usuarioId: user.id,
    gerenteAgenda,
    podeAgendar,
    podeRegistrar,
    agendamentos: agendamentos.map((a) => ({
      id: a.id,
      ptsId: a.ptsId,
      inicioEm: a.inicioEm,
      fimEm: a.fimEm,
      status: a.status,
      remarcadoDeId: a.remarcadoDeId,
      profissionalId: a.profissionalId,
      profissionalNome: a.profissional.nome,
      profissionalCategoria: a.profissional.categoria,
      pacienteNome: a.pts.paciente.nome,
      semaforoReuniao: a.pts.semaforoReuniao,
      fila: posicoesFila.get(a.ptsId)
        ? {
            posicao: posicoesFila.get(a.ptsId)!.posicao,
            estimativaDias: posicoesFila.get(a.ptsId)!.estimativaDias,
          }
        : null,
      ultimoEvento: a.pts.eventos[0] ?? null,
    })),
    casos: dadosCasos,
  };
}

export async function criarAgendamento(input: unknown): Promise<Resultado> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!recursos.includes("agenda.atendimentos.agendar")) {
    return { ok: false, erro: "Seu papel não permite agendar atendimentos." };
  }
  const parsed = novoAgendamentoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados de agendamento inválidos." };
  if (!user.cerId) return { ok: false, erro: "CER do usuário não identificado." };

  const { ptsId, profissionalId, duracaoMinutos } = parsed.data;
  const inicioEm = new Date(parsed.data.inicioEm);
  if (inicioEm.getTime() < Date.now() + HORA_MINIMA_FUTURA_MS) {
    return { ok: false, erro: "Escolha um horário futuro." };
  }
  const fimEm = new Date(inicioEm.getTime() + duracaoMinutos * 60_000);
  const gerenteAgenda = recursos.includes("agenda.atendimentos.gerenciar");

  try {
    const agendamento = await db.$transaction(
      async (tx) => {
        const pts = await verificarAcessoAoCaso(ptsId, user.cerId!, user.id, gerenteAgenda, tx);
        const profissional = await tx.usuario.findFirst({
          where: {
            id: profissionalId,
            cerId: user.cerId!,
            status: "ATIVO",
            papel: { base: "CLINICO" },
            OR: [
              ...(pts.refProfissionalId ? [{ id: pts.refProfissionalId }] : []),
              { equipePts: { some: { ptsId } } },
            ],
          },
          select: { id: true },
        });
        if (!profissional) throw new Error("O profissional precisa estar ativo e vinculado à equipe deste PTS.");
        await verificarDisponibilidade(tx, profissionalId, inicioEm, fimEm);
        const criado = await tx.agendamento.create({
          data: { ptsId, profissionalId, criadoPorId: user.id, inicioEm, fimEm },
        });
        await tx.auditoria.create({
          data: {
            actorId: user.id,
            action: "agenda.agendamento.criar",
            entityType: "agendamento",
            entityId: criado.id,
            afterJson: { ptsId, profissionalId, inicioEm, fimEm, status: criado.status },
          },
        });
        return criado;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath("/agenda");
    return { ok: true, agendamentoId: agendamento.id };
  } catch (e) {
    return { ok: false, erro: erroPrisma(e) ?? (e instanceof Error ? e.message : "Não foi possível agendar o atendimento.") };
  }
}

export async function reagendarAtendimento(input: unknown): Promise<Resultado> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!recursos.includes("agenda.atendimentos.agendar")) {
    return { ok: false, erro: "Seu papel não permite remarcar atendimentos." };
  }
  const parsed = reagendarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados de remarcação inválidos." };
  if (!user.cerId) return { ok: false, erro: "CER do usuário não identificado." };
  const novoInicio = new Date(parsed.data.inicioEm);
  if (novoInicio.getTime() < Date.now() + HORA_MINIMA_FUTURA_MS) {
    return { ok: false, erro: "Escolha um horário futuro." };
  }
  const gerenteAgenda = recursos.includes("agenda.atendimentos.gerenciar");

  try {
    const novoId = await db.$transaction(
      async (tx) => {
        const atual = await tx.agendamento.findFirst({
          where: { id: parsed.data.agendamentoId, pts: { cerId: user.cerId! } },
          select: {
            id: true,
            ptsId: true,
            profissionalId: true,
            inicioEm: true,
            fimEm: true,
            status: true,
          },
        });
        if (!atual) throw new Error("Atendimento não encontrado.");
        if (atual.status !== "AGENDADO") throw new Error("Somente atendimentos agendados podem ser remarcados.");
        if (!gerenteAgenda && atual.profissionalId !== user.id) {
          throw new Error("Somente o profissional agendado ou a recepção pode remarcar este atendimento.");
        }
        await verificarAcessoAoCaso(atual.ptsId, user.cerId!, user.id, gerenteAgenda, tx);
        const duracao = atual.fimEm.getTime() - atual.inicioEm.getTime();
        const novoFim = new Date(novoInicio.getTime() + duracao);
        await verificarDisponibilidade(tx, atual.profissionalId, novoInicio, novoFim, atual.id);
        await tx.agendamento.update({ where: { id: atual.id }, data: { status: "REMARCADO" } });
        const novo = await tx.agendamento.create({
          data: {
            ptsId: atual.ptsId,
            profissionalId: atual.profissionalId,
            criadoPorId: user.id,
            inicioEm: novoInicio,
            fimEm: novoFim,
            remarcadoDeId: atual.id,
          },
        });
        await tx.auditoria.create({
          data: {
            actorId: user.id,
            action: "agenda.agendamento.remarcar",
            entityType: "agendamento",
            entityId: novo.id,
            beforeJson: { agendamentoId: atual.id, status: atual.status, inicioEm: atual.inicioEm },
            afterJson: { agendamentoId: novo.id, status: novo.status, inicioEm: novoInicio, fimEm: novoFim },
          },
        });
        return novo.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath("/agenda");
    return { ok: true, agendamentoId: novoId };
  } catch (e) {
    return { ok: false, erro: erroPrisma(e) ?? (e instanceof Error ? e.message : "Não foi possível remarcar o atendimento.") };
  }
}

export async function cancelarAtendimento(input: unknown): Promise<Resultado> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!recursos.includes("agenda.atendimentos.gerenciar")) {
    return { ok: false, erro: "Seu papel não permite cancelar atendimentos." };
  }
  const parsed = cancelarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!user.cerId) return { ok: false, erro: "CER do usuário não identificado." };

  try {
    await db.$transaction(async (tx) => {
      const atual = await tx.agendamento.findFirst({
        where: { id: parsed.data.agendamentoId, pts: { cerId: user.cerId! } },
        select: { id: true, ptsId: true, status: true, inicioEm: true },
      });
      if (!atual) throw new Error("Atendimento não encontrado.");
      if (atual.status !== "AGENDADO") throw new Error("Somente atendimentos agendados podem ser cancelados.");
      await assertPtsMutavel(atual.ptsId, tx);
      const evento = await tx.eventoCuidado.create({
        data: {
          ptsId: atual.ptsId,
          tipo: "CANCELAMENTO",
          data: new Date(),
          observacao: `Atendimento cancelado: ${parsed.data.motivo}`,
          registradoPorId: user.id,
        },
      });
      await tx.agendamento.update({
        where: { id: atual.id },
        data: { status: "CANCELADO", eventoCuidadoId: evento.id },
      });
      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "agenda.agendamento.cancelar",
          entityType: "agendamento",
          entityId: atual.id,
          beforeJson: { status: atual.status },
          afterJson: { status: "CANCELADO", ptsId: atual.ptsId, inicioEm: atual.inicioEm, eventoCuidadoId: evento.id },
          motivo: parsed.data.motivo,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/agenda");
    return { ok: true, agendamentoId: parsed.data.agendamentoId };
  } catch (e) {
    return { ok: false, erro: erroPrisma(e) ?? (e instanceof Error ? e.message : "Não foi possível cancelar o atendimento.") };
  }
}

export async function registrarResultadoAtendimento(input: unknown): Promise<Resultado> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!recursos.includes("agenda.atendimentos.registrar")) {
    return { ok: false, erro: "Seu papel não permite registrar o resultado do atendimento." };
  }
  const parsed = registrarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados de atendimento inválidos." };
  if (!user.cerId) return { ok: false, erro: "CER do usuário não identificado." };

  try {
    await db.$transaction(async (tx) => {
      const atual = await tx.agendamento.findFirst({
        where: { id: parsed.data.agendamentoId, pts: { cerId: user.cerId! } },
        select: { id: true, ptsId: true, profissionalId: true, status: true, inicioEm: true, fimEm: true },
      });
      if (!atual) throw new Error("Atendimento não encontrado.");
      if (atual.profissionalId !== user.id) throw new Error("Somente o profissional agendado pode registrar o resultado.");
      if (atual.status !== "AGENDADO") throw new Error("O resultado deste atendimento já foi registrado ou ele foi cancelado.");
      if (atual.fimEm.getTime() > Date.now()) throw new Error("O resultado só pode ser registrado após o horário do atendimento.");
      await assertPtsMutavel(atual.ptsId, tx);
      const tipo = parsed.data.resultado === "REALIZADO" ? "SESSAO" : "FALTA";
      const evento = await tx.eventoCuidado.create({
        data: {
          ptsId: atual.ptsId,
          tipo,
          data: atual.inicioEm,
          observacao: parsed.data.observacao || undefined,
          registradoPorId: user.id,
        },
      });
      await tx.agendamento.update({
        where: { id: atual.id },
        data: { status: parsed.data.resultado, eventoCuidadoId: evento.id },
      });
      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: parsed.data.resultado === "FALTA" ? "agenda.atendimento.falta" : "agenda.atendimento.realizar",
          entityType: "agendamento",
          entityId: atual.id,
          beforeJson: { status: atual.status },
          afterJson: { status: parsed.data.resultado, ptsId: atual.ptsId, eventoCuidadoId: evento.id },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/agenda");
    return { ok: true, agendamentoId: parsed.data.agendamentoId };
  } catch (e) {
    return { ok: false, erro: erroPrisma(e) ?? (e instanceof Error ? e.message : "Não foi possível registrar o atendimento.") };
  }
}
