import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// ponytail: limpeza por execução; fixtures API quando houver mais fluxos com paciente
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

const CPF_BUSCA = gerarCpf();
const CPF_NOVO = gerarCpf();

test.beforeEach(async () => {
  for (const cpf of [CPF_BUSCA, CPF_NOVO]) {
    await db.auditoria.deleteMany({
      where: { entityType: "paciente", afterJson: { path: ["cpf"], equals: cpf } },
    });
    await db.paciente.deleteMany({ where: { cpf } });
  }
});

async function loginRecepcao(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("recepcao@pts.local");
  await page.getByLabel("Senha").fill("recepcao123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(dashboard|recepcao|$)/);
}

test("busca sem resultado direciona para o cadastro", async ({ page }) => {
  await loginRecepcao(page);
  await page.goto("/recepcao");
  await page.getByLabel("CPF ou CNS").fill(CPF_BUSCA);
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(page).toHaveURL(/\/recepcao\/novo/);
  await expect(page.getByLabel("CPF")).toHaveValue(CPF_BUSCA);
});

test("cadastro cria paciente e busca retorna existente; duplicado recusado", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await loginRecepcao(page);

  await page.goto(`/recepcao/novo?q=${CPF_NOVO}`);
  await page.getByLabel("Nome completo").fill("Maria Teste da Silva");
  await page
    .getByLabel("Data de nascimento")
    .fill("1990-05-10");
  await page.getByLabel("Sexo").selectOption("FEMININO");
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page).toHaveURL(/\/pacientes\//, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maria Teste da Silva"
  );

  // busca agora encontra o paciente criado
  await page.goto("/recepcao");
  await page.getByLabel("CPF ou CNS").fill(CPF_NOVO);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/pacientes\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maria Teste da Silva"
  );
  await expect(page.getByText(CPF_NOVO)).toBeVisible();

  // duplicado recusado com mensagem clara
  await page.goto(`/recepcao/novo?q=${CPF_NOVO}`);
  await page.getByLabel("Nome completo").fill("Outro Paciente");
  await page.getByLabel("Data de nascimento").fill("1980-01-01");
  await page.getByLabel("Sexo").selectOption("MASCULINO");
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page.getByText(/já cadastrado/)).toBeVisible();
});
