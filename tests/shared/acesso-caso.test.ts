import { describe, expect, it } from "vitest";

import { avaliarVinculoCaso } from "@/server/shared/acesso-caso";

describe("avaliarVinculoCaso", () => {
  it("usuário é a referência do PTS: acesso concedido", () => {
    expect(avaliarVinculoCaso("u1", { refProfissionalId: "u1" }, [])).toBe(true);
  });

  it("usuário é membro da equipe (não referência): acesso concedido", () => {
    expect(avaliarVinculoCaso("u1", { refProfissionalId: "u2" }, ["u1"])).toBe(true);
  });

  it("usuário nem é referência nem está na equipe: acesso negado", () => {
    expect(avaliarVinculoCaso("u1", { refProfissionalId: "u2" }, ["u3"])).toBe(false);
  });

  it("sem referência e sem equipe: acesso negado", () => {
    expect(avaliarVinculoCaso("u1", { refProfissionalId: null }, [])).toBe(false);
  });

  it("equipe vazia e referência de outro usuário: acesso negado", () => {
    expect(avaliarVinculoCaso("u1", { refProfissionalId: "u2" }, [])).toBe(false);
  });

  it("usuário é referência E também consta (redundante) na equipe: acesso concedido", () => {
    expect(avaliarVinculoCaso("u1", { refProfissionalId: "u1" }, ["u1"])).toBe(true);
  });

  it("equipe com múltiplos membros: encontra o usuário em qualquer posição", () => {
    expect(avaliarVinculoCaso("u2", { refProfissionalId: null }, ["u1", "u2", "u3"])).toBe(
      true,
    );
  });
});
