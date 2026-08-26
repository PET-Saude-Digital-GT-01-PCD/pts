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
const CPF_CUIDADOR = gerarCpf();

async function limparPaciente(cpf: string) {
  const pacientes = await db.paciente.findMany({
    where: { cpf },
    select: { id: true },
  });
  for (const p of pacientes) {
    const cids = (
      await db.consentimento.findMany({
        where: { pacienteId: p.id },
        select: { id: true },
      })
    ).map((c) => c.id);
    const gids = (
      await db.cuidador.findMany({
        where: { pacienteId: p.id },
        select: { id: true },
      })
    ).map((g) => g.id);
    await db.auditoria.deleteMany({
      where: {
        OR: [
          { entityType: "consentimento", entityId: { in: cids } },
          { entityType: "cuidador", entityId: { in: gids } },
          { entityType: "paciente", entityId: p.id },
        ],
      },
    });
    await db.cuidador.deleteMany({ where: { pacienteId: p.id } });
    await db.consentimento.deleteMany({ where: { pacienteId: p.id } });
    await db.paciente
      .delete({ where: { id: p.id } })
      .catch(() => undefined); // ponytail: pts de outra sessão pode referenciar; ignora
  }
}

test.beforeEach(async () => {
  for (const cpf of [CPF_BUSCA, CPF_NOVO, CPF_CUIDADOR]) {
    await limparPaciente(cpf);
  }
});

async function loginRecepcao(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("recepcao@pts.local");
  await page.getByLabel("Senha").fill("recepcao123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(dashboard|recepcao|$)/);
}

async function cadastrarPaciente(page: import("@playwright/test").Page, cpf: string, nome: string) {
  await page.goto(`/recepcao/novo?q=${cpf}`);
  await page.getByLabel("Nome completo").fill(nome);
  await page.getByLabel("Data de nascimento").fill("1990-05-10");
  await page.getByLabel("Sexo").selectOption("FEMININO");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(/Paciente cadastrado/)).toBeVisible({
    timeout: 15_000,
  });
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

  await cadastrarPaciente(page, CPF_NOVO, "Maria Teste da Silva");
  await page.getByRole("button", { name: "Ir para o paciente" }).click();
  await expect(page).toHaveURL(/\/pacientes\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maria Teste da Silva"
  );

  // busca agora encontra o paciente criado
  await page.goto("/recepcao");
  await page.getByLabel("CPF ou CNS").fill(CPF_NOVO);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/pacientes\//);
  await expect(page.getByText(CPF_NOVO)).toBeVisible();

  // duplicado recusado com mensagem clara
  await page.goto("/recepcao");
  await page.goto(`/recepcao/novo?q=${CPF_NOVO}`);
  await page.getByLabel("Nome completo").fill("Outro Paciente");
  await page.getByLabel("Data de nascimento").fill("1980-01-01");
  await page.getByLabel("Sexo").selectOption("MASCULINO");
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page.getByText(/já cadastrado/)).toBeVisible();
});

test("cuidador com Zarit alto alerta; consentimento registra e revoga", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await loginRecepcao(page);

  await cadastrarPaciente(page, CPF_CUIDADOR, "Joana Com Cuidador");

  // cuidador com Zarit alto
  await page.getByLabel("Nome do cuidador").fill("Carlos Cuidador");
  await page.getByLabel("Parentesco").fill("Filho");
  await page.getByLabel("Zarit (0–24)").fill("15");
  await page.getByRole("button", { name: "Registrar cuidador" }).click();

  await expect(page.getByTestId("zarit-alto")).toContainText("Serviço Social");

  // consentimento: registro e revogação append-only
  await page.getByRole("button", { name: "Registrar consentimento" }).click();
  const botaoRevogar = page.getByRole("button", { name: /Revogar consentimento/ });
  await expect(botaoRevogar).toBeVisible({ timeout: 15_000 });

  await botaoRevogar.click();
  await expect(page.getByText("Consentimento revogado.")).toBeVisible();

  // histórico preservado: 2 registros (original + revogação)
  const registros = await db.paciente.findFirst({
    where: { cpf: CPF_CUIDADOR },
    select: {
      consentimentos: { select: { revogadoEm: true, termoVersao: true, canal: true } },
      cuidadores: { select: { zaritScore: true } },
    },
  });
  expect(registros?.consentimentos).toHaveLength(2);
  expect(registros?.consentimentos.filter((c) => c.revogadoEm === null)).toHaveLength(1);
  expect(registros?.consentimentos.filter((c) => c.revogadoEm !== null)).toHaveLength(1);
  expect(registros?.consentimentos[0]?.canal).toBe("TABLET");
  expect(registros?.cuidadores[0]?.zaritScore).toBe(15);

  // alerta visível também na página do paciente
  await page.goto("/recepcao");
  await page.getByLabel("CPF ou CNS").fill(CPF_CUIDADOR);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("alert").first()).toContainText("Zarit alto");
});
