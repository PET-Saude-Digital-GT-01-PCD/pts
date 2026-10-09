"use server";

import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireAuth, getAtorReal } from "@/server/iam/session";
import {
  FUSO_RELATORIO, limitesPeriodo, montarIndicador, paraCsv, validarFiltroRelatorio,
  type FiltroRelatorio, type IndicadorGovernanca, type RelatorioGovernanca,
} from "@/server/governance/indicadores";
import {
  assinarSnapshot, verificarSnapshot, type ContextoExportacao,
} from "@/server/governance/snapshot";

export type PainelIndicadores = RelatorioGovernanca & {
  tokenExportacao: string;
  podeExportar: boolean;
};

type Identidade = {
  usuarioId: string;
  atorRealId: string;
  impersonando: boolean;
};

async function identidadeAtual(): Promise<Identidade> {
  const [sessao, real] = await Promise.all([requireAuth(), getAtorReal()]);
  if (!real.atorRealId || (!real.impersonando && real.atorRealId !== sessao.id)
      || (real.impersonando && real.usuarioSimuladoId !== sessao.id)) redirect("/login");
  return { usuarioId: sessao.id, atorRealId: real.atorRealId, impersonando: real.impersonando };
}

/** A sessão identifica; usuário, papel, permissões e CER vêm do banco a cada operação. */
async function exigirAcesso(tx: Prisma.TransactionClient, identidade: Identidade, exportacao: boolean) {
  const user = await tx.usuario.findUnique({
    where: { id: identidade.usuarioId },
    select: {
      id: true, status: true, cerId: true,
      cer: { select: { id: true, nome: true } },
      papel: {
        select: {
          cerId: true, ativo: true, base: true,
          recursos: { select: { recurso: { select: { chave: true } } } },
        },
      },
    },
  });
  if (!user || user.status !== "ATIVO") redirect("/login");
  // CER ausente nunca vira filtro undefined. Mesmo admin recebe escopo explícito.
  if (!user.cerId || !user.cer || !user.papel.ativo || user.papel.cerId !== user.cerId) redirect("/");
  const recursos = user.papel.recursos.map((r) => r.recurso.chave);
  const podeExportar = recursos.includes("governanca.relatorios.ver");
  if (exportacao ? !podeExportar : !podeExportar && !recursos.includes("governanca.dashboard.ver")) redirect("/");

  if (identidade.impersonando) {
    const real = await tx.usuario.findUnique({
      where: { id: identidade.atorRealId },
      select: { status: true, cerId: true, papel: { select: { base: true, ativo: true, cerId: true } } },
    });
    if (!real || real.status !== "ATIVO" || !real.papel.ativo || real.papel.base !== "ADMIN"
        || real.cerId !== user.cerId || real.papel.cerId !== real.cerId
        || identidade.atorRealId === user.id || user.papel.base === "ADMIN") redirect("/");
  }
  return {
    cer: user.cer,
    podeExportar,
    contexto: { ...identidade, cerId: user.cerId } satisfies ContextoExportacao,
  };
}

const DIA_MS = 86_400_000;
function percentual(numerador: number, denominador: number): number | null {
  return denominador === 0 ? null : Math.round(numerador / denominador * 1000) / 10;
}

/** Todos os acessos recebem CER obrigatório e o mesmo snapshot RepeatableRead. */
async function calcularIndicadores(
  tx: Prisma.TransactionClient,
  cerId: string,
  periodo: ReturnType<typeof limitesPeriodo>,
  cadenciaRevisaoDias: number,
  agora: Date,
): Promise<IndicadorGovernanca[]> {
  const intervalo = { gte: periodo.desde, lt: periodo.ateExclusivo };
  const [ptsAtivos, pacientes, eventos, ptsDoPeriodo, triagens] = await Promise.all([
    tx.pts.findMany({
      where: { cerId, status: { not: "FECHADO" } },
      select: {
        aberturaEm: true,
        revisoes: { select: { data: true }, orderBy: { data: "desc" }, take: 1 },
        _count: { select: { metas: true } },
      },
    }),
    tx.paciente.findMany({
      where: { cerId, pts: { some: { cerId, status: { not: "FECHADO" } } } },
      select: { baseline: { select: { id: true } } },
    }),
    tx.eventoCuidado.groupBy({
      by: ["tipo"], where: { pts: { cerId }, data: intervalo, tipo: { in: ["SESSAO", "FALTA"] } },
      _count: { _all: true },
    }),
    tx.pts.findMany({
      where: { cerId, aberturaEm: intervalo },
      select: {
        aberturaEm: true,
        avaliacoes: { select: { criadaEm: true }, orderBy: { criadaEm: "asc" }, take: 1 },
      },
    }),
    tx.triagem.findMany({
      where: { pts: { cerId }, criadaEm: intervalo },
      select: { _count: { select: { ajustes: true } } },
    }),
  ]);
  const limiteRevisao = agora.getTime() - cadenciaRevisaoDias * DIA_MS;
  const emDiaComMeta = ptsAtivos.filter((p) =>
    (p.revisoes[0]?.data ?? p.aberturaEm).getTime() >= limiteRevisao && p._count.metas > 0).length;
  const comMeta = ptsAtivos.filter((p) => p._count.metas > 0).length;
  const sessoes = eventos.find((e) => e.tipo === "SESSAO")?._count._all ?? 0;
  const faltas = eventos.find((e) => e.tipo === "FALTA")?._count._all ?? 0;
  const comAvaliacao = ptsDoPeriodo.filter((p) => p.avaliacoes.length > 0);
  const somaDias = comAvaliacao.reduce((soma, p) =>
    soma + (p.avaliacoes[0]!.criadaEm.getTime() - p.aberturaEm.getTime()) / DIA_MS, 0);
  // Preserva coortes do MVP: avaliações/ajustes posteriores ao período contam
  // se já cadastrados no snapshot. A descrição temporal explicita essa regra.
  return [
    montarIndicador("north-star", percentual(emDiaComMeta, ptsAtivos.length)),
    montarIndicador("cobertura-baseline", percentual(pacientes.filter((p) => p.baseline !== null).length, pacientes.length)),
    montarIndicador("metas-por-pts", percentual(comMeta, ptsAtivos.length)),
    montarIndicador("adesao", percentual(sessoes, sessoes + faltas)),
    montarIndicador("tempo-primeira-avaliacao", comAvaliacao.length === 0 ? null : Math.round(somaDias / comAvaliacao.length * 10) / 10),
    montarIndicador("divergencia-manual", percentual(triagens.filter((t) => t._count.ajustes > 0).length, triagens.length)),
    montarIndicador("tempo-recepcao", null),
    montarIndicador("pendencia-sync", null),
    montarIndicador("erro-integracao", null),
  ];
}

export async function buscarIndicadores(filtroInput?: FiltroRelatorio): Promise<PainelIndicadores> {
  const identidade = await identidadeAtual();
  const agora = new Date();
  const filtro = validarFiltroRelatorio(filtroInput, agora);
  return db.$transaction(async (tx) => {
    const acesso = await exigirAcesso(tx, identidade, false);
    const indicadores = await calcularIndicadores(
      tx, acesso.cer.id, limitesPeriodo(filtro.periodo), filtro.cadenciaRevisaoDias, agora,
    );
    const relatorio: RelatorioGovernanca = {
      snapshotId: randomUUID(), geradoEm: agora.toISOString(), cer: acesso.cer,
      ...filtro, indicadores,
    };
    return { ...relatorio, podeExportar: acesso.podeExportar, tokenExportacao: assinarSnapshot(relatorio, acesso.contexto) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function exportarCsv(tokenExportacao: string): Promise<{
  conteudo: string;
  nomeArquivo: string;
  tipoConteudo: "text/csv;charset=utf-8";
}> {
  const identidade = await identidadeAtual();
  return db.$transaction(async (tx) => {
    const acesso = await exigirAcesso(tx, identidade, true);
    const relatorio = verificarSnapshot(tokenExportacao, acesso.contexto);
    const conteudo = paraCsv(relatorio);
    // Auditoria append-only é pré-condição do retorno do arquivo. Sem INSERT
    // confirmado/commit, nenhum conteúdo de exportação é devolvido ao cliente.
    await tx.auditoria.create({
      data: {
        actorId: identidade.atorRealId,
        action: "governanca.relatorios.exportar",
        entityType: "relatorio_governanca",
        entityId: relatorio.snapshotId,
        afterJson: {
          cerId: relatorio.cer.id, periodo: relatorio.periodo, geradoEm: relatorio.geradoEm,
          fusoHorario: FUSO_RELATORIO,
          cadenciaRevisaoDias: relatorio.cadenciaRevisaoDias, formato: "CSV",
          quantidadeIndicadores: relatorio.indicadores.length,
          sha256: createHash("sha256").update(conteudo, "utf8").digest("hex"),
          usuarioEfetivoId: identidade.usuarioId, impersonando: identidade.impersonando,
        },
      },
    });
    return {
      conteudo,
      nomeArquivo: `indicadores-governanca-${relatorio.periodo.desde}-a-${relatorio.periodo.ate}.csv`,
      tipoConteudo: "text/csv;charset=utf-8" as const,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
