import type { BasePapel } from "@prisma/client";

export const RECURSOS_CLINICOS = ["soap.", "avaliacao."];
export const RECURSOS_ADMIN_ONLY = [
  "papeis.gerenciar",
  "config.org.editar",
  "usuarios.aprovar",
];

export function ehRecursoClinico(chave: string): boolean {
  return RECURSOS_CLINICOS.some((prefixo) => chave.startsWith(prefixo));
}

export function ehRecursoAdminOnly(chave: string): boolean {
  return RECURSOS_ADMIN_ONLY.includes(chave);
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