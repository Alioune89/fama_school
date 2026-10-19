import { expect, test } from "@playwright/test";

test.describe("pages publiques", () => {
  test("la page d'accueil présente Fama School et mène à la connexion", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("L'école, les professeurs et les parents");
    await page.getByRole("link", { name: "Se connecter" }).first().click();
    await expect(page).toHaveURL(/\/connexion$/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("le wolof est servi sous /wo avec repli en français", async ({ page }) => {
    await page.goto("/wo/connexion");
    await expect(page.locator("html")).toHaveAttribute("lang", "wo");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("un numéro invalide est refusé avec un message clair", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Numéro de téléphone").fill("12 34");
    await page.getByRole("button", { name: "Recevoir le code" }).click();
    await expect(page.getByText("Ce numéro n'est pas valide")).toBeVisible();
  });

  test("le manifeste PWA est disponible", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.name).toBe("Fama School");
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBeTruthy();
  });

  test("le bandeau hors ligne apparaît quand la connexion tombe", async ({ page, context }) => {
    await page.goto("/connexion");
    // L'écouteur de connectivité n'existe qu'une fois l'application hydratée.
    await page.waitForLoadState("networkidle");
    await context.setOffline(true);
    await expect(page.getByRole("status")).toContainText("Vous êtes hors ligne");
    await context.setOffline(false);
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("une URL inconnue affiche la page 404 traduite", async ({ page }) => {
    const response = await page.goto("/page-qui-n-existe-pas");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  });
});
