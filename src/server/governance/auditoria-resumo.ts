// Resumo de before/after da auditoria (#71): a trilha só grava metadados
// (ids, status, versões — nunca o conteúdo clínico bruto, ver ADR-0002),
// mas o viewer trunca mesmo assim como salvaguarda contra blobs grandes,
// pra nunca virar um "abrir o conteúdo clínico completo" por acidente.

const TAMANHO_MAXIMO_PADRAO = 160;

export function resumirJson(
  valor: unknown,
  tamanhoMaximo: number = TAMANHO_MAXIMO_PADRAO,
): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = JSON.stringify(valor);
  if (texto.length <= tamanhoMaximo) return texto;
  return `${texto.slice(0, tamanhoMaximo)}…`;
}
