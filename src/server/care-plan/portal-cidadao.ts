import { createHash, randomInt } from "node:crypto";

// Acesso do cidadão ao próprio PTS (#73): link com código no fim da URL.
// Decisão registrada no ADR-0012. Este arquivo é puro (sem "use server",
// sem Prisma) para poder ser testado por TDD: geração do código, hash,
// normalização do que o cidadão digita, validade e montagem da URL.
//
// ponytail: entrega do link é física (Paciente não tem e-mail/telefone) —
// upgrade = mandar o mesmo link por e-mail/WhatsApp quando houver contato.

const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford: sem I, L, O, U
const TAMANHO_CODIGO = 10;
const CONFUSIVE: Record<string, string> = { I: "1", L: "1", O: "0", U: "0" };

export const VALIDADE_PADRAO_DIAS = 30;
const DIA_MS = 24 * 60 * 60 * 1000;
const BASE_URL_PADRAO = "http://localhost:3000";

export function gerarCodigo(): string {
  let codigo = "";
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return codigo;
}

export function formatarCodigo(codigo: string): string {
  const limpo = normalizarCodigo(codigo);
  return `${limpo.slice(0, TAMANHO_CODIGO / 2)}-${limpo.slice(TAMANHO_CODIGO / 2)}`;
}

// O cidadão digita do jeito que quiser: minúsculo, com/espaços e hífen.
// Crockford também tolera I/L/O/U no lugar de 1/1/0/0.
export function normalizarCodigo(entrada: string): string {
  return entrada
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "")
    .replace(/[ILOU]/g, (c) => CONFUSIVE[c]);
}

export function hashCodigo(codigo: string): string {
  return createHash("sha256").update(normalizarCodigo(codigo)).digest("hex");
}

export function calcularExpiracao(
  agora: Date = new Date(),
  validadeDias: number = VALIDADE_PADRAO_DIAS,
): Date {
  return new Date(agora.getTime() + validadeDias * DIA_MS);
}

export function linkCidadao(
  codigo: string,
  baseUrl: string | undefined = process.env.AUTH_URL,
): string {
  const base = (baseUrl || BASE_URL_PADRAO).replace(/\/+$/, "");
  return `${base}/portal-cidadao/${formatarCodigo(codigo)}`;
}
