import { createHmac, randomInt } from "node:crypto";

// Código de acesso do portal do cidadão (#73, ADR-0012): 10 chars em
// alfabeto Crockford base32 (~50 bits, sem I/L/O/U — evita ambiguidade na
// leitura impressa). A entropia do código é o rate limit: brute force online
// de 50 bits não é viável e miss com hash desconhecido não gera evento.

const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TAMANHO = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function gerarCodigo(): string {
  let codigo = "";
  for (let i = 0; i < TAMANHO; i += 1) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return codigo;
}

/** Caixa alta, sem separadores e com leituras erradas comuns corrigidas
 * (I/L → 1, O → 0) — o digitado e o impresso convergem para o mesmo valor. */
export function normalizarCodigo(entrada: string): string {
  return entrada
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}

export function codigoValido(codigo: string): boolean {
  if (codigo.length !== TAMANHO) return false;
  for (const caractere of codigo) {
    if (!ALFABETO.includes(caractere)) return false;
  }
  return true;
}

/** HMAC-SHA256 com AUTH_SECRET (pepper): um vazamento do banco não permite
 * recuperar nem validar códigos por força bruta offline. Rotacionar
 * AUTH_SECRET invalida os códigos vigentes (mesmo custo das sessões Auth.js).
 * ponytail: fallback de dev/CI — em produção o Auth.js já exige AUTH_SECRET
 * (sem ele a aplicação não sobe). */
export function hashCodigo(codigo: string): string {
  const segredo = process.env.AUTH_SECRET || "dev-portal-pepper";
  return createHmac("sha256", segredo).update(codigo).digest("hex");
}

export function ehUuid(valor: string): boolean {
  return UUID_RE.test(valor);
}
