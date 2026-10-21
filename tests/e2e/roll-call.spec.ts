import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { DEMO, loginWithPhone } from "./helpers";

/** Touche l'élève jusqu'au statut voulu (présent → absent → en retard → présent). */
async function setStatus(row: Locator, status: "Présent" | "Absent" | "En retard") {
  await expect(async () => {
    if (!(await row.getAttribute("aria-label"))?.endsWith(`: ${status}`)) await row.click();
    await expect(row).toHaveAttribute("aria-label", new RegExp(`: ${status}$`), { timeout: 1_000 });
  }).toPass();
}

async function openSixiemeA(page: Page) {
  await page.goto("/professeur/appel");
  await expect(page.getByRole("heading", { name: "Faire l'appel", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /6e A/ }).click();
  await expect(page).toHaveURL(/\/professeur\/appel\/[0-9a-f-]{36}$/);
  const students = page.getByRole("list", { name: "Élèves de la classe" }).getByRole("button");
  await expect(students.first()).toBeVisible();
  // Partir d'un appel où tout le monde est présent, quels que soient les parcours précédents.
  const allPresent = page.getByRole("button", { name: "Tous présents" });
  await expect(async () => {
    if (await allPresent.isVisible()) await allPresent.click();
    await expect(page.getByText(/· 0 absent · 0 en retard/)).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return students;
}

const validate = (page: Page) => page.getByRole("button", { name: /Valider l'appel|Enregistrer les modifications/ });

test.describe("Appel du professeur", () => {
  // Une seule demande de code par série : le nombre de SMS par numéro est limité.
  let session: Awaited<ReturnType<BrowserContext["storageState"]>>;
  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const page = await context.newPage();
    await loginWithPhone(page, DEMO.teacherPhone);
    await expect(page).toHaveURL(/\/choisir-espace$/);
    await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
    await expect(page).toHaveURL(/\/professeur$/);
    session = await context.storageState();
    await context.close();
  });
  test.use({ storageState: async ({}, provide) => provide(session) });

  test("fait l'appel de sa classe en quelques touchers", async ({ page }) => {
    const students = await openSixiemeA(page);

    await setStatus(students.nth(0), "Absent");
    await setStatus(students.nth(1), "En retard");
    await expect(page.getByText(/1 absent · 1 en retard/)).toBeVisible();

    await validate(page).click();
    await expect(page.getByText(/Appel envoyé à \d{1,2} h \d{2}/)).toBeVisible();
    await expect(validate(page)).toBeDisabled();

    // L'appel est bien enregistré sur le serveur.
    await page.reload();
    await expect(students.nth(0)).toHaveAttribute("aria-label", /: Absent$/);
    await expect(students.nth(1)).toHaveAttribute("aria-label", /: En retard$/);

    await page.goto("/professeur/appel");
    await expect(page.getByRole("link", { name: /6e A/ }).getByText(/fait à .* · 1 absent · 1 retard/)).toBeVisible();
  });

  test("valide l'appel hors ligne puis l'envoie au retour du réseau", async ({ page, context }) => {
    const students = await openSixiemeA(page);

    await context.setOffline(true);
    await setStatus(students.nth(3), "Absent");
    await validate(page).click();
    await expect(page.getByText("Appel enregistré sur ce téléphone. Il partira dès le retour du réseau.")).toBeVisible();
    await expect(page.getByText("1 envoi en attente")).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByText(/Appel envoyé à \d{1,2} h \d{2}/)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText("1 envoi en attente")).toBeHidden();

    await page.reload();
    await expect(students.nth(0)).toHaveAttribute("aria-label", /: Présent$/);
    await expect(students.nth(3)).toHaveAttribute("aria-label", /: Absent$/);
  });
});
