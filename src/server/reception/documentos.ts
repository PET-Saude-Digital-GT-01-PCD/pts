export function soDigitos(valor: string): string {
  return valor.replace(/\D+/g, "");
}

function dvCpf(digitos: number[]): number {
  let soma = 0;
  for (let i = 0; i < digitos.length; i++) {
    soma += digitos[i] * (digitos.length + 1 - i);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCpf(valor: string): boolean {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const digitos = [...cpf].map(Number);
  if (dvCpf(digitos.slice(0, 9)) !== digitos[9]) return false;
  return dvCpf(digitos.slice(0, 10)) === digitos[10];
}

export function validarCns(valor: string): boolean {
  const cns = soDigitos(valor);
  if (cns.length !== 15) return false;
  if (!/^[12789]/.test(cns)) return false;
  const soma = [...cns].reduce(
    (acc, d, i) => acc + Number(d) * (15 - i),
    0,
  );
  return soma % 11 === 0;
}
