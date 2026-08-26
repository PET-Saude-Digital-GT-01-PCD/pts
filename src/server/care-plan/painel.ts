// Montagem do painel do caso (issue #16): agrega o que existir em timeline
// única, ordenada por data desc. Pura — testável sem I/O.

export type ItemTimeline = {
  tipo:
    | "abertura"
    | "avaliacao"
    | "meta"
    | "revisao"
    | "triagem"
    | "evento_cuidado";
  data: Date;
  titulo: string;
  detalhe?: string;
};

export function montarTimeline(input: {
  aberturaEm: Date;
  avaliacoes?: { id: string; especialidade: string; criadaEm: Date }[];
  metas?: { id: string; descTecnica: string; dataPactuacao: Date }[];
  revisoes?: { id: string; numero: number; motivo: string; data: Date }[];
  triagens?: { id: string; classificacao: string; criadaEm: Date }[];
  eventosCuidado?: { id: string; tipo: string; data: Date }[];
}): ItemTimeline[] {
  const itens: ItemTimeline[] = [
    { tipo: "abertura", data: input.aberturaEm, titulo: "PTS aberto" },
  ];

  for (const a of input.avaliacoes ?? []) {
    itens.push({
      tipo: "avaliacao",
      data: a.criadaEm,
      titulo: `Avaliação (${a.especialidade})`,
    });
  }

  for (const m of input.metas ?? []) {
    itens.push({
      tipo: "meta",
      data: m.dataPactuacao,
      titulo: "Meta pactuada",
      detalhe: m.descTecnica,
    });
  }

  for (const r of input.revisoes ?? []) {
    itens.push({
      tipo: "revisao",
      data: r.data,
      titulo: `Revisão #${r.numero}`,
      detalhe: r.motivo,
    });
  }

  for (const t of input.triagens ?? []) {
    itens.push({
      tipo: "triagem",
      data: t.criadaEm,
      titulo: `Triagem (semáforo ${t.classificacao})`,
    });
  }

  for (const e of input.eventosCuidado ?? []) {
    itens.push({
      tipo: "evento_cuidado",
      data: e.data,
      titulo: `Evento de cuidado (${e.tipo})`,
    });
  }

  return itens.sort((a, b) => b.data.getTime() - a.data.getTime());
}
