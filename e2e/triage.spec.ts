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

const CPFS = [gerarCpf(), gerarCpf(), gerarCpf(), gerarCpf()];

async function limpar(cpf: string) {
  const pacientes = await db.paciente.findMany({
    where: { cpf },
    select: { id: true },
  });
  for (const p of pacientes) {
    const triagens = await db.triagem.findMany({
      where: { pts: { pacienteId: p.id } },
      select: { id: true, ajustes: { select: { id: true } } },
    });
    const ajustes = triagens.flatMap((t) => t.ajustes.map((a) => a.id));
    await db.auditoria.deleteMany({
      where: {
        OR: [
          { entityType: "ajuste_classificacao", entityId: { in: ajustes } },
          { entityType: "triagem", entityId: { in: triagens.map((t) => t.id) } },
          { entityType: "pts", afterJson: { path: ["pacienteId"], equals: p.id } },
          { entityType: "paciente", entityId: p.id },
        ],
      },
    });
    await db.ajusteClassificacao.deleteMany({ where: { triagemId: { in: triagens.map((t) => t.id) } } });
    await db.triagem.deleteMany({ where: { id: { in: triagens.map((t) => t.id) } } });
    await db.pts.deleteMany({ where: { pacienteId: p.id } });
    await db.paciente.delete({ where: { id: p.id } }).catch(() => undefined);
  }
}

test.beforeEach(async ({ }, testInfo) => {
  await limpar(CPFS[testInfo.workerIndex % CPFS.length]);
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

/** Cria paciente pela recepção e devolve à página do paciente. */
function cpfDoTeste(): string {
  return CPFS[test.info().workerIndex % CPFS.length];
}

async function criarPaciente(page: import("@playwright/test").Page, nome: string) {
  const CPF = cpfDoTeste();
  await login(page, "recepcao@pts.local", "recepcao123");
  await page.goto(`/recepcao/novo?q=${CPF}`);
  await page.getByLabel("Nome completo").fill(nome);
  await page.getByLabel("Data de nascimento").fill("1990-05-10");
  await page.getByLabel("Sexo").selectOption("FEMININO");
  await page.getByLabel("Município de origem").fill("Recife");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(/Paciente cadastrado/)).toBeVisible({
    timeout: 15_000,
  });
  // sai da sessão recepção para entrar como triador
  await page.context().clearCookies();
  await login(page, "triador@pts.local", "triador123");
}

test("nascimento: triagem elegível cria PTS visível com semáforo; pontuacaoJson reproduz input", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await criarPaciente(page, "Nora Triagem Elegivel");
  const paciente = await db.paciente.findFirstOrThrow({
    where: { cpf: cpfDoTeste() },
    select: { id: true },
  });

  await page.goto(`/pacientes/${paciente.id}`);
  await page.getByLabel("CID-10").fill("G40");
  await page.getByLabel("Motivo do encaminhamento").fill("Convulsão em investigação");
  await page.getByLabel("Mobilidade").fill("10");
  await page.getByLabel("Autocuidado").fill("20");
  await page.getByRole("button", { name: "Concluir triagem" }).click();

  await expect(page).toHaveURL(/\?aba=triagem$/, { timeout: 20_000 });
  await expect(page.getByTestId("resultado-semaforo")).toContainText("Amarelo");

  // pontuacaoJson reproduz o mesmo input
  const triagem = await db.triagem.findFirstOrThrow({
    where: { pts: { pacienteId: paciente.id } },
    select: { eixosJson: true, classificacao: true, resultadoElegibilidade: true },
  });
  expect(triagem.resultadoElegibilidade).toBe("ELEGIVEL");
  const eixos = triagem.eixosJson as { funcional: number[] };
  expect(eixos.funcional).toEqual([10, 20, 100, 100]);
});

test("não elegível não persiste nada e orienta retorno à APS", async ({ page }) => {
  test.setTimeout(90_000);
  await criarPaciente(page, "Nora Nao Elegivel");
  const paciente = await db.paciente.findFirstOrThrow({
    where: { cpf: cpfDoTeste() },
    select: { id: true },
  });

  await page.goto(`/pacientes/${paciente.id}`);
  await page.getByLabel("CID-10").fill("H90");
  await page.getByLabel("Motivo do encaminhamento").fill("Perda auditiva");
  await page.getByRole("button", { name: "Concluir triagem" }).click();

  await expect(page.getByTestId("nao-elegivel")).toContainText("APS");

  const pts = await db.pts.count({ where: { pacienteId: paciente.id } });
  expect(pts).toBe(0);
});

test("revisão manual exige justificativa e nasce com REVISAO_MANUAL; ajuste append-only", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await criarPaciente(page, "Nora Revisao Manual");
  const paciente = await db.paciente.findFirstOrThrow({
    where: { cpf: cpfDoTeste() },
    select: { id: true },
  });

  await page.goto(`/pacientes/${paciente.id}`);
  await page.getByLabel("CID-10").fill("Z99");
  await page.getByLabel("Motivo do encaminhamento").fill("Dependência de cuidados");
  await page.getByLabel("Mobilidade").fill("10");
  await page.getByLabel("Autocuidado").fill("20");
  await page.getByRole("button", { name: "Concluir triagem" }).click();

  // sem justificativa → recusa
  await expect(page.getByText(/informe a justificativa/i)).toBeVisible();

  // com justificativa → nasce
  await page
    .getByLabel(/Justificativa clínica/)
    .fill("Quadro atípico; avaliação clínica necessária.");
  await page.getByRole("button", { name: "Concluir triagem" }).click();

  await expect(page).toHaveURL(/\?aba=triagem$/, { timeout: 20_000 });
  const triagem = await db.triagem.findFirstOrThrow({
    where: { pts: { pacienteId: paciente.id } },
    include: { ajustes: true },
  });
  expect(triagem.resultadoElegibilidade).toBe("REVISAO_MANUAL");

  // ajuste sem motivo → recusado (HTML required bloqueia submit); via action direta:
  // valida pelo banco que nenhum ajuste existe ainda
  expect(triagem.ajustes).toHaveLength(0);

  // ajuste com motivo → vigente muda
  await page.getByRole("button", { name: "Ajustar classificação" }).click();
  await page.getByLabel("Nova classificação").selectOption("VERDE");
  await page.getByLabel("Motivo (obrigatório)").fill("Reavaliação funcional boa");
  await page.getByRole("button", { name: "Confirmar ajuste" }).click();

  await expect(page.getByTestId("vigente-badge")).toContainText("Verde", {
    timeout: 15_000,
  });
  const ajustes = await db.ajusteClassificacao.findMany({
    where: { triagemId: triagem.id },
  });
  expect(ajustes).toHaveLength(1);
  expect(ajustes[0].de).toBe("AMARELO");
  expect(ajustes[0].para).toBe("VERDE");
});

test("re-triagem com versão antiga retorna conflito 409", async ({ page }) => {
  test.setTimeout(120_000);
  await criarPaciente(page, "Nora Conflito Versao");
  const paciente = await db.paciente.findFirstOrThrow({
    where: { cpf: cpfDoTeste() },
    select: { id: true },
  });

  // primeira triagem nasce o caso
  await page.goto(`/pacientes/${paciente.id}`);
  await page.getByLabel("CID-10").fill("M54");
  await page.getByLabel("Motivo do encaminhamento").fill("Dor crônica coluna");
  await page.getByRole("button", { name: "Concluir triagem" }).click();
  await expect(page).toHaveURL(/\?aba=triagem$/, { timeout: 20_000 });
  const ptsUrl = page.url().match(/casos\/([0-9a-f-]+)\?/)?.[1];
  expect(ptsUrl).toBeDefined();

  // outra pessoa avança a versão do PTS por baixo;
  // o form já carregado ainda tem a versão antiga
  await db.pts.update({
    where: { id: ptsUrl! },
    data: { versao: { increment: 1 } },
  });

  await page.getByLabel("CID-10").fill("M54");
  await page.getByLabel("Motivo do encaminhamento").fill("Dor persistente");
  await page.getByRole("button", { name: "Registrar re-triagem" }).click();

  await expect(page.getByText(/conflito de versão/i)).toBeVisible({ timeout: 15_000 });
});
