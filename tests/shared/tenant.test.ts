import { afterAll, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { buscarCerUnico } from "@/server/shared/tenant";

const CER_ID = "00000000-0000-4000-8000-000000000001";
const criados: string[] = [];

// O delegate do Prisma é proxy: vi.spyOn não repassa a chamada ao original e
// mockRestore deixa findFirst undefined. Guarda o original para devolver.
const findFirstOriginal = db.cer.findFirst.bind(db.cer);
function espiarFindFirstNull() {
  const spy = vi.spyOn(db.cer, "findFirst").mockResolvedValueOnce(null);
  return {
    spy,
    devolver: () => spy.mockImplementation(findFirstOriginal as never),
  };
}

afterAll(async () => {
  await db.cer.deleteMany({ where: { id: { in: criados } } });
  await db.$disconnect();
});

describe("shared/tenant — buscarCerUnico (ADR-0010, deploy-per-org)", () => {
  it("devolve o CER da instância com id e papel de auto-cadastro", async () => {
    const cer = await buscarCerUnico();
    expect(cer?.id).toBe(CER_ID);
    expect(cer).toHaveProperty("papelAutocadastroId");
  });

  it("sem CER cadastrado devolve null (banco migrado sem seed)", async () => {
    const { devolver } = espiarFindFirstNull();
    expect(await buscarCerUnico()).toBeNull();
    devolver();
  });

  it("com mais de um CER (o schema permite) resolve sempre o mais antigo, não um qualquer", async () => {
    const extra = await db.cer.create({
      data: { nome: "CER extra (teste tenant)", municipio: "Teste" },
    });
    criados.push(extra.id);

    const cer = await buscarCerUnico();
    expect(cer?.id).toBe(CER_ID);
  });

  it("ordena por criadaEm em vez de depender da ordem física do Postgres", async () => {
    const { spy, devolver } = espiarFindFirstNull();
    await buscarCerUnico();
    expect(spy.mock.calls.at(-1)?.[0]).toMatchObject({ orderBy: { criadaEm: "asc" } });
    devolver();
  });
});
