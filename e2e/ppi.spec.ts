import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CER_ID = "00000000-0000-4000-8000-000000000001";

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

test.afterEach(async ({}, testInfo) => {
  const cpf = testInfo.annotations.find((a) => a.type === "cpf")?.description;
  if (!cpf) return;
  const paciente = await db.paciente.findFirst({ where: { cpf }, select: { id: true } });
  if (!paciente) return;
  await db.auditoria.deleteMany({ where: { entityType: "paciente", entityId: paciente.id } });
  await db.paciente.delete({ where: { id: paciente.id } });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("município sem PPI pactuada gera cadastro provisório com alerta (#65)", async ({
  page,
}, testInfo) => {
  const cpf = gerarCpf();
  testInfo.annotations.push({ type: "cpf", description: cpf });

  await login(page, "recepcao@pts.local", "recepcao123");
  await page.goto(`/recepcao/novo?q=${cpf}`);
  await page.getByLabel("Nome completo").fill("Paciente Provisório E2E");
  await page.getByLabel("Data de nascimento").fill("1990-05-10");
  await page.getByLabel("Sexo").selectOption("FEMININO");
  await page.getByLabel("Município de origem").fill("Olinda");
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page.getByTestId("alerta-provisorio")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("alerta-provisorio")).toContainText("PPI não pactuada");

  const paciente = await db.paciente.findFirstOrThrow({ where: { cpf } });
  expect(paciente.provisorio).toBe(true);

  await page.goto(`/pacientes/${paciente.id}`);
  await expect(page.getByTestId("alerta-provisorio")).toBeVisible();
});

test("município com PPI pactuada cadastra sem alerta de provisório (#65)", async ({
  page,
}, testInfo) => {
  const cpf = gerarCpf();
  testInfo.annotations.push({ type: "cpf", description: cpf });

  await login(page, "recepcao@pts.local", "recepcao123");
  await page.goto(`/recepcao/novo?q=${cpf}`);
  await page.getByLabel("Nome completo").fill("Paciente Pactuado E2E");
  await page.getByLabel("Data de nascimento").fill("1990-05-10");
  await page.getByLabel("Sexo").selectOption("MASCULINO");
  await page.getByLabel("Município de origem").fill("Recife");
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page.getByText(/Paciente cadastrado/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("alerta-provisorio")).toHaveCount(0);
});

test("dashboard de recepção/triagem lista alerta de regularização pendente (#65)", async ({
  page,
}) => {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: "Paciente Alerta Dashboard",
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
      municipioOrigem: "Olinda",
      provisorio: true,
      prazoRegularizacao: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  try {
    await login(page, "triador@pts.local", "triador123");
    await page.goto("/dashboard");

    await expect(page.getByTestId("alertas-ppi-dashboard")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("alertas-ppi-dashboard")).toContainText(
      "Paciente Alerta Dashboard",
    );
    await expect(page.getByTestId("alertas-ppi-dashboard")).toContainText("vencido");
  } finally {
    await db.paciente.delete({ where: { id: paciente.id } });
  }
});
