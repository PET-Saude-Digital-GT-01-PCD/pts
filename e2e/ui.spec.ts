import { test, expect } from "@playwright/test";

test("header com marca aparece em home e login", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /PTS Digital/ })
  ).toBeVisible();

  await page.goto("/login");
  await expect(
    page.getByRole("link", { name: /PTS Digital/ })
  ).toBeVisible();
});

test("toggle de tema alterna para o tema escuro", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Trocar tema" }).click();
  await page.getByRole("menuitem", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("dashboard renderiza com a marca após login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@pts.local");
  await page.getByLabel("Senha").fill("admin123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("link", { name: /PTS Digital/ })
  ).toBeVisible();
});