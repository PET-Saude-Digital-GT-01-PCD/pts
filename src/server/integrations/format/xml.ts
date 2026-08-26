import type { BaselinePaciente } from "../canonical";

// Tradutor canônico ↔ XML mínimo. Serialização com template strings e parse
// com regex — zero dependência nova (stdlib primeiro). Escapa os cinco
// caracteres XML obrigatórios.
// ponytail: teto = parser regex por seções conhecidas; upgrade = fast-xml-parser
// se o formato crescer.

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escaparXml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function desescapar(texto: string): string {
  return texto
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function secao(nome: string, itens: string[]): string {
  return `<${nome}>${itens.map((i) => `<item>${escaparXml(i)}</item>`).join("")}</${nome}>`;
}

function itensDaSecao(xml: string, nome: string): string[] {
  const bloco = new RegExp(`<${nome}>([\\s\\S]*?)</${nome}>`).exec(xml)?.[1];
  if (!bloco) return [];
  return [...bloco.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) =>
    desescapar(m[1]),
  );
}

export function baselineParaXml(b: BaselinePaciente): string {
  const medicamentos = b.medicacoes
    .map(
      (m) =>
        `<medicacao><nome>${escaparXml(m.nome)}</nome>${
          m.dosagem === null ? "" : `<dosagem>${escaparXml(m.dosagem)}</dosagem>`
        }</medicacao>`,
    )
    .join("");
  return [
    `<baseline>`,
    `<identificador>${escaparXml(b.identificador)}</identificador>`,
    secao("diagnosticos", b.diagnosticos),
    secao("alergias", b.alergias),
    `<medicacoes>${medicamentos}</medicacoes>`,
    secao("internacoes", b.internacoes),
    `</baseline>`,
  ].join("");
}

export function xmlParaBaseline(xml: string): BaselinePaciente {
  const medicacoes = [...xml.matchAll(/<medicacao>([\s\S]*?)<\/medicacao>/g)].map(
    (m) => ({
      nome: desescapar(/<nome>([\s\S]*?)<\/nome>/.exec(m[1])?.[1] ?? ""),
      dosagem:
        /<dosagem>([\s\S]*?)<\/dosagem>/.exec(m[1])?.[1] !== undefined
          ? desescapar(/<dosagem>([\s\S]*?)<\/dosagem>/.exec(m[1])![1])
          : null,
    }),
  );
  return {
    identificador: desescapar(
      /<identificador>([\s\S]*?)<\/identificador>/.exec(xml)?.[1] ?? "",
    ),
    diagnosticos: itensDaSecao(xml, "diagnosticos"),
    alergias: itensDaSecao(xml, "alergias"),
    medicacoes,
    internacoes: itensDaSecao(xml, "internacoes"),
  };
}
