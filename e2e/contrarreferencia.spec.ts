import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const db = new PrismaClient();
const CER_ID = "00000000-0000-4000-8000-000000000001";

const pacienteIds: string[] = [];
const ptsIds: string[] = [];
const guiaIds: string[] = [];

async function limparGuiasDoPaciente(cpf: string) {
  const paciente = await db.paciente.findFirst({ where: { cpf }, select: { id: true } });
  if (!paciente) return;
  const guias = await db.contrarreferencia.findMany({
    where: { pacienteId: paciente.id },
    select: { id: true },
  });
  await db.auditoria.deleteMany({
    where: { entityType: "contrarreferencia", entityId: { in: guias.map((g) => g.id) } },
  });
  await db.contrarreferencia.deleteMany({ where: { pacienteId: paciente.id } });
  await db.pts.deleteMany({ where: { pacienteId: paciente.id } });
  await db.paciente.delete({ where: { id: paciente.id } });
}

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

const CPF_NAO_ELEGIVEL = gerarCpf();

test.afterAll(async () => {
  await limparGuiasDoPaciente(CPF_NAO_ELEGIVEL);
  if (guiaIds.length > 0) {
    await db.auditoria.deleteMany({
      where: { entityType: "contrarreferencia", entityId: { in: guiaIds } },
    });
    await db.contrarreferencia.deleteMany({ where: { id: { in: guiaIds } } });
  }
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
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

test("NAO_ELEGIVEL na triagem oferece emissão de guia; resumo imprimível abre (#62)", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await login(page, "recepcao@pts.local", "recepcao123");
  await page.goto(`/recepcao/novo?q=${CPF_NAO_ELEGIVEL}`);
  await page.getByLabel("Nome completo").fill("Paciente Não Elegível");
  await page.getByLabel("Data de nascimento").fill("1990-05-10");
  await page.getByLabel("Sexo").selectOption("FEMININO");
  await page.getByLabel("Município de origem").fill("Recife");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(/Paciente cadastrado/)).toBeVisible({ timeout: 15_000 });

  await page.context().clearCookies();
  await login(page, "triador@pts.local", "triador123");

  const paciente = await db.paciente.findFirstOrThrow({
    where: { cpf: CPF_NAO_ELEGIVEL },
    select: { id: true },
  });

  await page.goto(`/pacientes/${paciente.id}`);
  await page.getByLabel("CID-10").fill("H90");
  await page.getByLabel("Motivo do encaminhamento").fill("Perda auditiva");
  await page.getByRole("button", { name: "Concluir triagem" }).click();

  await expect(page.getByTestId("nao-elegivel")).toBeVisible();
  await page.getByTestId("abrir-guia-contrarreferencia").click();
  await page.getByLabel("UBS/APS de destino (opcional)").fill("UBS Central");
  await page.getByRole("button", { name: "Emitir guia" }).click();

  await expect(page.getByTestId("guia-emitida")).toBeVisible({ timeout: 15_000 });

  const [novaAba] = await Promise.all([
    page.context().waitForEvent("page"),
    page.getByRole("link", { name: "Ver/imprimir" }).click(),
  ]);
  await novaAba.waitForLoadState();
  await expect(novaAba.getByTestId("guia-contrarreferencia-resumo")).toBeVisible();
  await expect(novaAba.getByText("UBS Central")).toBeVisible();
  await expect(novaAba.getByText("Paciente Não Elegível")).toBeVisible();
});

test("encerramento por contrarreferência emite guia e ela aparece na aba triagem (#62)", async ({
  page,
}) => {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Encerramento ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const referencia = await db.usuario.findUniqueOrThrow({
    where: { email: "referencia@pts.local" },
    select: { id: true },
  });
  const pts = await db.pts.create({
    data: {
      pacienteId: paciente.id,
      cerId: CER_ID,
      status: "REAVALIACAO",
      refProfissionalId: referencia.id,
    },
  });
  ptsIds.push(pts.id);

  await login(page, "referencia@pts.local", "referencia123");
  await page.goto(`/casos/${pts.id}`);

  await page.getByRole("button", { name: "Encerrar PTS" }).click();
  await page.getByLabel("Tipo de encerramento").selectOption("CONTRARREFERENCIA");
  await page.getByLabel("Motivo (obrigatório)").fill("Alta com encaminhamento à APS.");
  await page.getByLabel("UBS/APS de destino (opcional)").fill("UBS Sul");
  await page.getByRole("button", { name: "Confirmar encerramento" }).click();

  await expect(page.getByTestId("status-pts")).toHaveText("Fechado", { timeout: 15_000 });
  await expect(page.getByTestId("guia-emitida-encerramento")).toBeVisible();

  await page.goto(`/casos/${pts.id}?aba=triagem`);
  await expect(page.getByTestId("guias-contrarreferencia")).toContainText("UBS Sul");

  const guia = await db.contrarreferencia.findFirstOrThrow({ where: { ptsId: pts.id } });
  guiaIds.push(guia.id);
});
