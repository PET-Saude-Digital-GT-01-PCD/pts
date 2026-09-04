// Campos dinâmicos de admissão (#15): formulario_config define, por CER, quais
// campos extras o formulário de auto-cadastro coleta. Validação é dirigida
// pelos dados da tabela — sem "use server": usada tanto no client (renderizar
// o form) quanto no server action (validar o envio).

export type TipoCampoFormulario = "TEXTO" | "NUMERO" | "SELECT" | "BOOLEANO";

export type CampoFormularioConfig = {
  campo: string;
  rotulo: string;
  tipo: TipoCampoFormulario;
  obrigatorio: boolean;
  opcoes: string[] | null;
};

export type ResultadoValidacaoCampos =
  | { ok: true; dados: Record<string, string | number | boolean> }
  | { ok: false; erro: string };

function vazio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === "";
}

export function validarCamposDinamicos(
  campos: CampoFormularioConfig[],
  valores: Record<string, unknown>,
): ResultadoValidacaoCampos {
  const dados: Record<string, string | number | boolean> = {};

  for (const c of campos) {
    const bruto = valores[c.campo];

    if (c.obrigatorio && vazio(bruto)) {
      return { ok: false, erro: `${c.rotulo} é obrigatório.` };
    }
    if (vazio(bruto)) continue;

    if (c.tipo === "NUMERO") {
      const n = Number(bruto);
      if (Number.isNaN(n)) {
        return { ok: false, erro: `${c.rotulo} deve ser numérico.` };
      }
      dados[c.campo] = n;
    } else if (c.tipo === "BOOLEANO") {
      dados[c.campo] = bruto === true || bruto === "true" || bruto === "on";
    } else if (c.tipo === "SELECT") {
      const valor = String(bruto);
      if (c.opcoes && !c.opcoes.includes(valor)) {
        return { ok: false, erro: `${c.rotulo}: opção inválida.` };
      }
      dados[c.campo] = valor;
    } else {
      dados[c.campo] = String(bruto).trim();
    }
  }

  return { ok: true, dados };
}
