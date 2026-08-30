import type { BasePapel } from "@prisma/client";

export const RECURSOS_CLINICOS = ["clinical."];
export const PREFIXO_ADMIN_ONLY = "admin.";

export function ehRecursoClinico(chave: string): boolean {
  return RECURSOS_CLINICOS.some((prefixo) => chave.startsWith(prefixo));
}

export function ehRecursoAdminOnly(chave: string): boolean {
  return chave.startsWith(PREFIXO_ADMIN_ONLY);
}

export type ResultadoValidacao = { ok: boolean; violacoes: string[] };

export function validarRecursos(
  base: BasePapel,
  chaves: string[],
): ResultadoValidacao {
  const violacoes: string[] = [];

  for (const chave of chaves) {
    if (base === "GESTOR" && ehRecursoClinico(chave)) {
      violacoes.push(
        `Papel com base GESTOR não pode ter recurso clínico: ${chave}`,
      );
    }
    if (base !== "ADMIN" && ehRecursoAdminOnly(chave)) {
      violacoes.push(`Recurso restrito à base ADMIN: ${chave}`);
    }
  }

  return { ok: violacoes.length === 0, violacoes };
}

export function temPermissao(recursos: string[], chave: string): boolean {
  return recursos.includes(chave);
}

export function podeDeletarPapel(
  emUso: boolean,
  ultimoAdminAtivo: boolean,
): boolean {
  return !emUso && !ultimoAdminAtivo;
}

/** Aprovação: só possível se o usuário está PENDENTE. */
export function podeAprovar(status: string): boolean {
  return status === "PENDENTE";
}

/** Rejeição: só possível se PENDENTE e motivo com ao menos 10 caracteres. */
export function podeRejeitar(status: string, motivo: string): boolean {
  return status === "PENDENTE" && motivo.trim().length >= 10;
}