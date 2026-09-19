import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

// Fluxo standalone de /dashboard/usuarios (#113). Usa um usuário próprio do
// teste para não mutar o papel dos usuários do seed, dos quais outros specs
// dependem.

const db = new PrismaClient();
const CER_ID = "00000000-0000-4000-8000-000000000001";
const email = `usuarios-e2e-${randomUUID().slice(0, 8)}@pts.local`;
let usuarioId: string;

test.beforeAll(async () => {
  const fisio = await db.papel.findUniqueOrThrow({
    where: { cerId_nome: { cerId: CER_ID, nome: "FISIOTERAPEUTA" } },
  });
  const u = await db.usuario.create({
    data: {
      cerId: CER_ID,
      email,
      senhaHash: "hash-placeholder",
      nome: "Usuária E2E Usuarios",
      categoria: "FISIOTERAPEUTA",
      papelId: fisio.id,
    },
  });
  usuarioId = u.id;
});

test.afterAll(async () => {
  await db.auditoria.deleteMany({ where: { entityType: "usuario", entityId: usuarioId } });
  await db.usuario.delete({ where: { id: usuarioId } });
  await db.$disconnect();
});

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("lista usuários ativos com status e papel", async ({ page }) => {
  await page.goto("/dashboard/usuarios");
  await expect(page.getByRole("heading", { name: "Usuários", exact: true })).toBeVisible();

  const linha = page.locator(`[data-email="${email}"]`);
  await expect(linha).toContainText("Usuária E2E Usuarios");
  await expect(linha).toContainText("ATIVO");
  await expect(linha.locator("select option:checked")).toHaveText("FISIOTERAPEUTA");
  // PENDENTE fica na fila de aprovação, não na tabela de ativos
  await expect(page.locator('tr[data-email="pendente@pts.local"]')).toHaveCount(0);
});

test("atribui papel pelo AtribuirPapelForm e persiste após recarregar", async ({ page }) => {
  await page.goto("/dashboard/usuarios");
  const linha = page.locator(`[data-email="${email}"]`);
  const salvar = linha.getByRole("button", { name: "Salvar" });

  // sem mudança, salvar fica desabilitado
  await expect(salvar).toBeDisabled();
  await linha.locator("select").selectOption({ label: "MEDICO" });
  await salvar.click();
  await expect(linha.getByText("salvo")).toBeVisible();

  await page.reload();
  const selecionado = page.locator(`[data-email="${email}"] select option:checked`);
  await expect(selecionado).toHaveText("MEDICO");
});

test("botão Simular aparece só onde o guardrail permite e abre o perfil simulado", async ({
  page,
}) => {
  await page.goto("/dashboard/usuarios");

  // admin tem admin.usuarios.impersonar: coluna de ações visível
  await expect(page.getByRole("columnheader", { name: "Ações" })).toBeVisible();
  // clínico ativo: pode simular
  await expect(
    page.locator(`[data-email="${email}"]`).getByRole("button", { name: "Simular" }),
  ).toBeVisible();
  // o próprio admin e usuário bloqueado: sem botão (podeImpersonar)
  for (const semBotao of ["admin@pts.local", "bloqueado@pts.local"]) {
    await expect(
      page.locator(`[data-email="${semBotao}"]`).getByRole("button", { name: "Simular" }),
    ).toHaveCount(0);
  }

  await page.locator(`[data-email="${email}"]`).getByRole("button", { name: "Simular" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Simulando perfil:")).toContainText("Usuária E2E Usuarios");

  await page.getByRole("button", { name: "Voltar ao meu perfil" }).click();
  await expect(page).toHaveURL(/\/dashboard\/usuarios$/);
  await expect(page.getByText("Simulando perfil:")).toHaveCount(0);
});
