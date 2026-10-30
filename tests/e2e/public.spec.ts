import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail } from "./helpers";

test.describe("pages publiques", () => {
  test("la page d'accueil présente Fama School et mène à la connexion", { tag: "@smoke" }, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("L'école, les enseignants et les parents");
    await page.getByRole("link", { name: "Se connecter" }).first().click();
    await expect(page).toHaveURL(/\/connexion$/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("le wolof est servi sous /wo avec repli en français", { tag: "@smoke" }, async ({ page }) => {
    await page.goto("/wo/connexion");
    await expect(page.locator("html")).toHaveAttribute("lang", "wo");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("un numéro invalide est refusé avec un message clair", { tag: "@smoke" }, async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Numéro de téléphone").fill("12 34");
    await page.getByRole("button", { name: "Recevoir le code" }).click();
    await expect(page.getByText("Ce numéro n'est pas valide")).toBeVisible();
  });

  test("le manifeste PWA est disponible", { tag: "@smoke" }, async ({ request }) => {
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

  test("une URL inconnue affiche la page 404 traduite", { tag: "@smoke" }, async ({ page }) => {
    const response = await page.goto("/page-qui-n-existe-pas");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  });
});

test.describe("page d'accueil : demande de démo", () => {
  test("un visiteur demande une démo, l'équipe Fama School la suit", async ({ page, browser }) => {
    const digits = String(Date.now()).slice(-7);
    const phone = `76 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)}`;
    const school = `École Démo ${Date.now().toString(36)}`;

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Des formules simples, selon la taille de l'école" })).toBeVisible();
    await expect(page.getByText("120 000 FCFA").first()).toBeVisible();

    await page.getByRole("link", { name: "Demander une démo" }).first().click();
    // Écrire directement sur WhatsApp, message pré-rempli.
    await expect(page.getByRole("link", { name: "Écrire sur WhatsApp" })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/221777650980\?text=Bonjour/,
    );
    // Trois champs suffisent : nom, téléphone, école.
    await page.getByLabel("Votre nom").fill("Mame Diarra Sène");
    await page.getByLabel("Nom de l'école").fill(school);
    await page.getByLabel("Téléphone").fill("12 34");
    await page.getByRole("button", { name: "Être rappelé" }).click();
    await expect(page.getByText("Numéro invalide. Exemple : 77 123 45 67.")).toBeVisible();

    await page.getByLabel("Téléphone").fill(phone);
    await page.getByText("Ajouter des précisions (facultatif)").click();
    await page.getByLabel("Votre fonction").selectOption("founder");
    await page.getByLabel("Ville").fill("Mbour");
    await page.getByLabel("Nombre d'élèves").selectOption("200to500");
    await page.getByRole("button", { name: "Être rappelé" }).click();
    await expect(page.getByText("Merci, votre demande est bien reçue.")).toBeVisible();

    const admin = await (await browser.newContext()).newPage();
    await loginWithEmail(admin, DEMO.admin);
    await expect(admin).toHaveURL(/\/plateforme$/);
    // Le bandeau de l'équipe signale les demandes à rappeler et y mène.
    await admin.getByRole("link", { name: /demandes? de démo à rappeler/ }).click();
    await expect(admin).toHaveURL(/\/plateforme\/demandes$/);
    await expect(admin.getByText(school)).toBeVisible();
    await expect(admin.getByText("Mbour · 200 à 500 élèves").first()).toBeVisible();
    const status = admin.getByRole("combobox", { name: "Suivi de la demande de Mame Diarra Sène" }).first();
    await status.selectOption("contacted");
    await expect(admin.getByText("Suivi mis à jour.")).toBeVisible();
    await admin.reload();
    await expect(admin.getByRole("combobox", { name: "Suivi de la demande de Mame Diarra Sène" }).first()).toHaveValue(
      "contacted",
    );
  });
});
