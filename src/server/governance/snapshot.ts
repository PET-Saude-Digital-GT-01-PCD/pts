import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type { RelatorioGovernanca } from "@/server/governance/indicadores";

// Este módulo contém segredo/criptografia e só pode ser importado por código
// servidor. O módulo indicadores.ts permanece seguro para uso na UI.
export type ContextoExportacao = {
  usuarioId: string;
  atorRealId: string;
  cerId: string;
  impersonando: boolean;
};

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TOKEN = 128_000;
const mensagemInvalida = "Relatório inválido ou expirado. Atualize o painel e tente novamente.";

const contextoSchema = z.object({
  usuarioId: z.string().uuid(), atorRealId: z.string().uuid(),
  cerId: z.string().uuid(), impersonando: z.boolean(),
}).strict();

const indicadorSchema = z.object({
  id: z.string().max(100), titulo: z.string().max(500), valor: z.number().finite().nullable(),
  unidade: z.string().max(50), meta: z.number().finite(), maiorEhMelhor: z.boolean(),
  fonte: z.string().max(2000), disponivel: z.boolean(),
  escopoTemporal: z.enum(["ATUAL", "PERIODO", "INDISPONIVEL"]),
  formula: z.string().max(2000), descricaoTemporal: z.string().max(2000),
}).strict();

const payloadSchema = z.object({
  versao: z.literal(1),
  contexto: contextoSchema,
  expiraEm: z.number().int(),
  relatorio: z.object({
    snapshotId: z.string().uuid(), geradoEm: z.string().datetime(),
    cer: z.object({ id: z.string().uuid(), nome: z.string().min(1).max(2000) }).strict(),
    periodo: z.object({
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).strict(),
    cadenciaRevisaoDias: z.number().int().min(1).max(365),
    indicadores: z.array(indicadorSchema).length(9),
  }).strict(),
}).strict();

function chaveAssinatura(): Buffer {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo?.trim()) throw new Error("AUTH_SECRET é obrigatório para os relatórios de governança.");
  // Derivação com domínio próprio evita usar diretamente a chave de sessão.
  return createHmac("sha256", segredo).update("pts/governanca/exportacao/v1").digest();
}

function assinatura(payload: string): Buffer {
  return createHmac("sha256", chaveAssinatura()).update(payload).digest();
}

/** Conteúdo agregado assinado, ligado à identidade/contexto e independente do processo Vercel. */
export function assinarSnapshot(relatorio: RelatorioGovernanca, contexto: ContextoExportacao): string {
  const payload = payloadSchema.parse({
    versao: 1, contexto, relatorio,
    expiraEm: new Date(relatorio.geradoEm).getTime() + TTL_MS,
  });
  const codificado = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${codificado}.${assinatura(codificado).toString("base64url")}`;
}

export function verificarSnapshot(
  token: unknown,
  contexto: ContextoExportacao,
  agora: Date = new Date(),
): RelatorioGovernanca {
  if (typeof token !== "string" || token.length > MAX_TOKEN) throw new Error(mensagemInvalida);
  const partes = token.split(".");
  if (partes.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(partes[0]!) || !/^[A-Za-z0-9_-]{43}$/.test(partes[1]!)) {
    throw new Error(mensagemInvalida);
  }
  const [codificado, assinaturaRecebida] = partes as [string, string];
  const esperado = assinatura(codificado);
  const recebido = Buffer.from(assinaturaRecebida, "base64url");
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)
      || recebido.toString("base64url") !== assinaturaRecebida) throw new Error(mensagemInvalida);
  let payload: z.infer<typeof payloadSchema>;
  try {
    payload = payloadSchema.parse(JSON.parse(Buffer.from(codificado, "base64url").toString("utf8")));
  } catch {
    throw new Error(mensagemInvalida);
  }
  const geradoEm = new Date(payload.relatorio.geradoEm).getTime();
  if (payload.expiraEm !== geradoEm + TTL_MS || agora.getTime() >= payload.expiraEm || geradoEm > agora.getTime()
      || payload.contexto.usuarioId !== contexto.usuarioId || payload.contexto.atorRealId !== contexto.atorRealId
      || payload.contexto.cerId !== contexto.cerId || payload.contexto.impersonando !== contexto.impersonando
      || payload.relatorio.cer.id !== contexto.cerId) throw new Error(mensagemInvalida);
  return payload.relatorio;
}
