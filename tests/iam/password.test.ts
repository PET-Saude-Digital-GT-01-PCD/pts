import { describe, expect, it } from "vitest";

import {
  hashSenha,
  verificarSenha,
} from "@/server/iam/password";

describe("iam/password", () => {
  it("hashSenha gera hash bcrypt não-plano", async () => {
    const hash = await hashSenha("senha-secreta");
    expect(hash).not.toBe("senha-secreta");
    expect(hash).toMatch(/^\$2/);
  });

  it("verificarSenha aceita a senha correta", async () => {
    const hash = await hashSenha("senha-secreta");
    await expect(verificarSenha("senha-secreta", hash)).resolves.toBe(true);
  });

  it("verificarSenha rejeita senha incorreta", async () => {
    const hash = await hashSenha("senha-secreta");
    await expect(verificarSenha("outra-senha", hash)).resolves.toBe(false);
  });

  it("gerar dois hashes da mesma senha produz hashes distintos (salt)", async () => {
    const [a, b] = await Promise.all([
      hashSenha("senha-secreta"),
      hashSenha("senha-secreta"),
    ]);
    expect(a).not.toBe(b);
    await expect(verificarSenha("senha-secreta", a)).resolves.toBe(true);
    await expect(verificarSenha("senha-secreta", b)).resolves.toBe(true);
  });
});