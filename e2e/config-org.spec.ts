import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CER_PILOTO_ID = "00000000-0000-4000-8000-000000000001";

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

// OrgConfig é 1:1 com o único CER da instância (ADR-0010): qualquer edição é
// estado global, visível em toda a app enquanto o teste roda. Restaura os
// defaults sempre, mesmo se a asserção falhar, pra não vazar pros specs que
// checam a marca padrão "PTS Digital" (smoke.spec.ts, ui.spec.ts).
test.afterEach(async () => {
  await db.orgConfig.deleteMany({ where: { cerId: CER_PILOTO_ID } });
});

test("admin edita nome/logo/parceiros e vê refletido no preview, header, rodapé e título (#68)", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await loginAdmin(page);
  await page.goto("/dashboard/config-org");

  await page.getByLabel("Nome exibido").fill("CER Piloto Recife");
  await page.getByLabel("URL do logo (opcional)").fill("https://example.org/logo.png");
  await page.getByLabel("Nome", { exact: true }).fill("UFPB");
  await page.getByLabel("URL do logo", { exact: true }).fill("https://example.org/ufpb.png");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByTestId("config-org-ok")).toBeVisible();
  // pré-visualização já reflete o estado do form, sem precisar navegar
  await expect(
    page.locator("form").getByText("CER Piloto Recife", { exact: true }),
  ).toBeVisible();

  // header/rodapé/título refletem o valor persistido
  await page.goto("/");
  await expect(page).toHaveTitle("CER Piloto Recife");
  await expect(
    page.getByRole("link", { name: /CER Piloto Recife/ }),
  ).toBeVisible();
  const parceiros = page.getByTestId("parceiros-org");
  await expect(parceiros).toBeVisible();
  await expect(parceiros.getByAltText("UFPB")).toBeVisible();
});

test("não-admin não acessa /dashboard/config-org", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("fisio@pts.local");
  await page.getByLabel("Senha").fill("fisio123");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });

  await page.goto("/dashboard/config-org");
  await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
});

test("sem configuração, header/título usam o padrão PTS Digital", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("PTS Digital");
  await expect(page.getByRole("link", { name: /PTS Digital/ })).toBeVisible();
});
