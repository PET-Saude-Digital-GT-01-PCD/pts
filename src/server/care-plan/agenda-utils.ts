const DIA_MS = 24 * 60 * 60 * 1000;
const OFFSET_RECIFE_MS = 3 * 60 * 60 * 1000;

export type IntervaloAgenda = { inicio: Date; fim: Date; primeiroDia: string };

/** Recebe uma data civil do CER e devolve a semana de segunda a segunda em Recife. */
export function intervaloSemanaAgenda(dataReferencia: string): IntervaloAgenda {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataReferencia)) {
    throw new Error("Data da agenda inválida.");
  }
  const [ano, mes, dia] = dataReferencia.split("-").map(Number);
  const referencia = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    referencia.getUTCFullYear() !== ano ||
    referencia.getUTCMonth() !== mes - 1 ||
    referencia.getUTCDate() !== dia
  ) {
    throw new Error("Data da agenda inválida.");
  }

  const deslocamentoSegunda = (referencia.getUTCDay() + 6) % 7;
  const segundaCivil = new Date(referencia.getTime() - deslocamentoSegunda * DIA_MS);
  const inicioCivil = segundaCivil.toISOString().slice(0, 10);
  const inicio = new Date(segundaCivil.getTime() + OFFSET_RECIFE_MS);
  return {
    inicio,
    fim: new Date(inicio.getTime() + 7 * DIA_MS),
    primeiroDia: inicioCivil,
  };
}

export function somarDiasCivis(dataCivil: string, dias: number): string {
  const [ano, mes, dia] = dataCivil.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export function horariosSeSobrepoem(
  inicio: Date,
  fim: Date,
  existente: { inicioEm: Date; fimEm: Date },
): boolean {
  return inicio < existente.fimEm && fim > existente.inicioEm;
}

export function dataCivilRecife(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}
