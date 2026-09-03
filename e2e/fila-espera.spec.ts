import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function gerarCpf(): string {
  const d = [...Array(9)].map(() => Math.floor(Math.random() * 10));
  const dv = (base: number[]): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += base[i] * (base.length + 1 - i);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return [...d, dv(d), dv([...d, dv(d)])].join("");
}

const CPF = gerarCpf();

test.beforeAll(async () => {
  const pacientes = await db.paciente.findMany({ where: { cpf: CPF }, select: { id: true } });
  for (const p of pacientes) {
    const triagens = await db.triagem.findMany({
      where: { pts: { pacienteId: p.id } },
      select: { id: true },
    });
    await db.auditoria.deleteMany({
      where: {
        OR: [
          { entityType: "triagem", entityId: { in: triagens.map((t) => t.id) } },
          { entityType: "pts", afterJson: { path: ["pacienteId"], equals: p.id } },
          { entityType: "paciente", entityId: p.id },
        ],
      },
    });
    await db.triagem.deleteMany({ where: { id: { in: triagens.map((t) => t.id) } } });
    await db.pts.deleteMany({ where: { pacienteId: p.id } });
    await db.paciente.delete({ where: { id: p.id } }).catch(() => undefined);
  }
});

async function login(
  page: import("@playwright/test").Page,
  email: string,
  senha: string,
) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname !== "/login");
}

test("paciente classificado Amarelo entra na fila de espera com posição e estimativa (#67)", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await login(page, "recepcao@pts.local", "recepcao123");
  await page.goto(`/recepcao/novo?q=${CPF}`);
  await page.getByLabel("Nome completo").fill("Nora Fila Amarela");
  await page.getByLabel("Data de nascimento").fill("1990-05-10");
  await page.getByLabel("Sexo").selectOption("FEMININO");
  await page.getByLabel("Município de origem").fill("Recife");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(/Paciente cadastrado/)).toBeVisible({ timeout: 15_000 });

  await page.context().clearCookies();
  await login(page, "triador@pts.local", "triador123");

  const paciente = await db.paciente.findFirstOrThrow({
    where: { cpf: CPF },
    select: { id: true },
  });

  // mesma combinação usada em triage.spec.ts para classificação AMARELO
  await page.goto(`/pacientes/${paciente.id}`);
  await page.getByLabel("CID-10").fill("G40");
  await page.getByLabel("Motivo do encaminhamento").fill("Convulsão em investigação");
  await page.getByLabel("Mobilidade").fill("10");
  await page.getByLabel("Autocuidado").fill("20");
  await page.getByRole("button", { name: "Concluir triagem" }).click();

  await expect(page).toHaveURL(/\?aba=triagem$/, { timeout: 20_000 });
  await expect(page.getByTestId("resultado-semaforo")).toContainText("Amarelo");

  // volta pra ficha do paciente: fila de espera deve aparecer com posição + estimativa
  await page.goto(`/pacientes/${paciente.id}`);
  await expect(page.getByTestId("fila-amarela")).toContainText(
    /posição \d+ — estimativa de [\d.]+ dia\(s\) até a chamada\./,
  );
});
