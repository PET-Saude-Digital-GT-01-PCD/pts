/** Parseador independente do serializador: aceita delimitador ;, aspas e CR/LF no campo. */
export function lerCsv(conteudo: string): string[][] {
  const texto = conteudo.replace(/^\uFEFF/, "");
  const linhas: string[][] = [];
  let linha: string[] = [], campo = "", entreAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (entreAspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') entreAspas = false;
      else campo += c;
    } else if (c === '"' && campo === "") entreAspas = true;
    else if (c === ";") { linha.push(campo); campo = ""; }
    else if (c === "\r" || c === "\n") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = "";
    } else campo += c;
  }
  if (entreAspas) throw new Error("CSV com aspas abertas");
  if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}
