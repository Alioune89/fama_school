import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail, loginWithPhone } from "./helpers";

// Nécessite Supabase local avec le seed : `npm run db:reset`.
test.describe("connexion et espaces", () => {
  test("un visiteur est renvoyé vers la connexion en voulant ouvrir un espace", async ({ page }) => {
    await page.goto("/direction");
    await expect(page).toHaveURL(/\/connexion\?suite=%2Fdirection$/);
  });

  test("un code OTP erroné est refusé", async ({ page }) => {
    // Numéro dédié : Supabase refuse deux envois de code au même numéro à moins de 5 s d'écart.
    await loginWithPhone(page, DEMO.censorPhone, "000000");
    await expect(page.getByText("Code incorrect ou expiré")).toBeVisible();
  });

  test("un parent invité entre directement dans son espace", async ({ page }) => {
    await loginWithPhone(page, DEMO.parentPhone);
    await expect(page).toHaveURL(/\/parent$/);
    await expect(page.getByRole("heading", { name: "Mes enfants", level: 1 })).toBeVisible();
    await expect(page.getByText("Bonjour Fatou")).toBeVisible();
  });

  test("un vacataire choisit son école parmi ses deux espaces", async ({ page }) => {
    await loginWithPhone(page, DEMO.teacherPhone);
    await expect(page).toHaveURL(/\/choisir-espace$/);
    await expect(page.getByRole("button", { name: /Professeur/ })).toHaveCount(2);
    await page.getByRole("button", { name: /Institut Franco-Arabe Al Amine/ }).click();
    await expect(page).toHaveURL(/\/professeur$/);
    await expect(page.getByText("Bonjour Awa · Institut Franco-Arabe Al Amine")).toBeVisible();
  });

  test("le directeur voit le tableau de bord de son école puis se déconnecte", async ({ page, isMobile }) => {
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
    await expect(page.getByRole("heading", { name: "Tableau de bord", level: 1 })).toBeVisible();
    await expect(page.getByText("Groupe Scolaire Les Baobabs").first()).toBeVisible();
    await expect(page.getByText("Invitations en attente")).toBeVisible();

    if (isMobile) await page.getByRole("button", { name: "Plus" }).click();
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/connexion$/);
  });

  test("l'équipe Fama School voit toutes les écoles clientes", async ({ page }) => {
    await loginWithEmail(page, DEMO.admin);
    await expect(page).toHaveURL(/\/plateforme$/);
    await expect(page.getByRole("cell", { name: /Groupe Scolaire Les Baobabs/ })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Institut Franco-Arabe Al Amine/ })).toBeVisible();
  });
});
