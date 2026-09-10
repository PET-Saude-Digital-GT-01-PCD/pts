import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/iam/session", () => ({
  requirePermissao: async () => ({
    id: "usuario-teste",
    nome: "Teste",
    email: "teste@pts.local",
    papelId: "papel-teste",
    basePapel: "CLINICO",
    nomePapel: "TESTE",
    status: "ATIVO",
    categoria: null,
    cerId: "00000000-0000-4000-8000-000000000001",
  }),
}));

import { criarTriagem } from "@/server/triage/registrar";

const eixosValidos = {
  bandeiras: {
    motivoAgudo: false,
    altaHospitalarRecente: false,
    posCirurgico: false,
  },
  funcional: [50, 50, 50, 50] as [number, number, number, number],
  social: { cuidadorPresente: true, zaritScore: 5, vulnerabilidades: 0 },
};

describe("triage/registrar — criarTriagem exige version em re-triagem (lock otimista)", () => {
  it("re-triagem (ptsId presente) sem version é rejeitada antes de tocar o banco", async () => {
    const r = await criarTriagem({
      ptsId: "00000000-0000-4000-8000-00000000ee01",
      cid: "M545",
      motivo: "Reavaliação de rotina",
      eixos: eixosValidos,
      // version omitido de propósito
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect("erro" in r ? r.erro : "").toContain("versão");
  });

  it("nascimento (pacienteId presente, sem ptsId/version) não é afetado pela regra de re-triagem", async () => {
    const r = await criarTriagem({
      pacienteId: "00000000-0000-4000-8000-00000000ee02",
      cid: "M545",
      motivo: "Triagem inicial",
      eixos: eixosValidos,
    });
    // Passa da validação de schema; falha adiante por paciente inexistente —
    // não pela ausência de version (que só se aplica a re-triagem).
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const mensagem = "erro" in r ? r.erro : "";
    expect(mensagem).not.toContain("versão do PTS");
  });
});
