import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Tableau de bord de la direction", () => {
  test("chaque indicateur ouvre son détail ; les parents se filtrent et s'invitent", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Le logo ramène à la page d'accueil du site, même connecté.
    await page.getByRole("link", { name: "Fama School" }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/:\d+\/$/);
    await page.goto("/direction");

    await page.getByRole("link", { name: /Élèves inscrits/ }).click();
    await expect(page).toHaveURL(/\/direction\/eleves$/);
    await page.goto("/direction");
    await page
      .getByRole("link", { name: /Enseignants/ })
      .filter({ hasText: /^\d/ })
      .click();
    await expect(page).toHaveURL(/\/direction\/professeurs$/);
    await page.goto("/direction");
    await page.getByRole("link", { name: /^\d+ Classes$/ }).click();
    await expect(page).toHaveURL(/\/direction\/classes$/);
    await page.goto("/direction");
    await page.getByRole("link", { name: /Parents connectés sur/ }).click();

    await expect(page).toHaveURL(/\/direction\/parents$/);
    await expect(page.getByRole("heading", { level: 1, name: "Parents" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Part des parents connectés" })).toBeVisible();
    await page.getByLabel("Connexion").selectOption({ label: "Pas encore connecté" });
    await expect(page).toHaveURL(/statut=non-connectes/);
    const invite = page.getByRole("link", { name: "Inviter par WhatsApp" }).first();
    await expect(invite).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=.*Fama%20School/);
    await expect(page.locator("li").getByText("Connecté", { exact: true })).toHaveCount(0);
  });

  test("le professeur ouvre ses classes, l'appel et ses messages depuis ses indicateurs", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithPhone(page, DEMO.teacherPhone);
    await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
    await expect(page).toHaveURL(/\/professeur$/);
    await page
      .getByRole("link", { name: /Mes classes/ })
      .filter({ hasText: /^\d/ })
      .click();
    await expect(page).toHaveURL(/\/professeur\/classes$/);
    const sixth = page.getByRole("region", { name: /^6e A/ }).filter({ visible: true });
    await expect(sixth.getByRole("link", { name: "Faire l'appel" })).toBeVisible();
    await sixth.getByText(/^Les \d+ élèves/).click();
    await expect(sixth.getByText("Sow Mariama")).toBeVisible();

    await page.goto("/professeur");
    await page.getByRole("link", { name: /Appels du matin faits/ }).click();
    await expect(page).toHaveURL(/\/professeur\/appel$/);
    await page.goto("/professeur");
    await page.getByRole("link", { name: /Messages non lus/ }).click();
    await expect(page).toHaveURL(/\/professeur\/messages$/);
  });
});
