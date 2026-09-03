import type { BasePapel } from "@prisma/client";

export const RECURSOS_CLINICOS = ["clinical."];
export const PREFIXO_ADMIN_ONLY = "admin.";

// Escrita clínica fora do prefixo clinical.* também é vedada à base GESTOR
// (ADR-0009; plano/17 §4; Perguntas/03 §3.6 — gestor só lê dado clínico
// individualizado). Lista explícita: prefixos genéricos vazariam recursos de
// leitura (ex.: care-plan.meta.ler, triage.triagem.ver) que o gestor precisa.
export const RECURSOS_ESCRITA_CLINICA_VEDADOS_GESTOR = [
  "care-plan.meta.escrever",
  "care-plan.pts.revisar",
  "care-plan.pts.encerrar",
  "care-plan.mural.escrever",
  "triage.triagem.escrever",
  "triage.semaforo.ajustar",
  "triage.contrarreferencia.emissao",
];

export function ehRecursoClinico(chave: string): boolean {
  return RECURSOS_CLINICOS.some((prefixo) => chave.startsWith(prefixo));
}

export function ehRecursoVedadoGestor(chave: string): boolean {
  return (
    ehRecursoClinico(chave) ||
    RECURSOS_ESCRITA_CLINICA_VEDADOS_GESTOR.includes(chave)
  );
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
    if (base === "GESTOR" && ehRecursoVedadoGestor(chave)) {
      violacoes.push(
        `Papel com base GESTOR não pode ter recurso de escrita clínica: ${chave}`,
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