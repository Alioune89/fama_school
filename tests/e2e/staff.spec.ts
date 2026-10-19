import { expect, test, type Locator, type Page } from "@playwright/test";
import { DEMO, loginWithEmail } from "./helpers";

/** Texte visible (les pages précédentes restent en mémoire, masquées, et le tableau est caché sur mobile). */
const visibleText = (page: Page, text: string) => page.getByText(text).filter({ visible: true }).first();

/** Choisit l'option dont le libellé commence par… (le titulaire actuel peut varier d'une exécution à l'autre). */
async function selectByPrefix(select: Locator, prefix: string) {
  const value = await select.evaluate(
    (element, start) => [...(element as HTMLSelectElement).options].find((option) => option.label.startsWith(start))?.value ?? "",
    prefix,
  );
  expect(value, `option « ${prefix} »`).not.toBe("");
  await select.selectOption(value);
}

/** Numéro unique par exécution (évite les doublons du répertoire entre desktop et mobile). */
function uniquePhone() {
  const digits = String(Date.now()).slice(-7);
  return `70 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)}`;
}

test.describe("Lot 1 — professeurs et personnel", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
  });

  test("la liste des professeurs se cherche et se filtre par contrat", async ({ page }) => {
    await page.goto("/direction/professeurs");
    await expect(page.getByRole("heading", { name: "Professeurs", level: 1 })).toBeVisible();
    await expect(visibleText(page, "Ousmane Faye")).toBeVisible();

    await page.getByPlaceholder("Rechercher un professeur…").fill("Ousmane");
    await expect(page).toHaveURL(/q=Ousmane/);
    await expect(page.getByText("1 personne").filter({ visible: true })).toBeVisible();

    await page.getByPlaceholder("Rechercher un professeur…").fill("");
    await page.getByRole("combobox", { name: "Contrat" }).selectOption("vacataire");
    await expect(page).toHaveURL(/contrat=vacataire/);
    await expect(visibleText(page, "Mariama Ba")).toBeVisible();
    await expect(page.getByText("Ousmane Faye").filter({ visible: true })).toHaveCount(0);
  });

  test("ajouter un professeur, l'affecter et le nommer professeur principal", async ({ page }) => {
    const name = `Professeur Test ${Date.now().toString(36)}`;
    await page.goto("/direction/professeurs");
    await page.getByRole("button", { name: "Ajouter un professeur" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Nom complet").fill(name);
    await sheet.getByLabel("Téléphone").fill(uniquePhone());
    await sheet.getByLabel("Contrat").selectOption("vacataire");
    await sheet.getByRole("button", { name: "Ajouter" }).click();

    await expect(page).toHaveURL(/\/direction\/professeurs\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(visibleText(page, "Invité")).toBeVisible();

    // Réaffecte les mathématiques de 6e A (actuellement Ousmane Faye)
    await page.getByLabel("Classe", { exact: true }).selectOption({ label: "6e A" });
    await selectByPrefix(page.getByLabel("Matière", { exact: true }), "Mathématiques");
    await page.getByRole("button", { name: "Affecter" }).click();
    await expect(page.getByRole("button", { name: "Retirer Mathématiques en 6e A" })).toBeVisible();

    await selectByPrefix(page.getByLabel("Nommer professeur principal de"), "5e A");
    await expect(page.getByRole("button", { name: "Ne plus être professeur principal de 5e A" })).toBeVisible();
  });

  test("le personnel administratif s'ajoute avec sa fonction", async ({ page }) => {
    await page.goto("/direction/personnel");
    await expect(visibleText(page, "Bineta Gueye")).toBeVisible();
    await page.getByRole("button", { name: "Ajouter un membre du personnel" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Fonction").selectOption("supervisor");
    const name = `Surveillant Test ${Date.now().toString(36)}`;
    await sheet.getByLabel("Nom complet").fill(name);
    await sheet.getByLabel("Téléphone").fill(uniquePhone());
    await sheet.getByRole("button", { name: "Ajouter" }).click();
    await expect(page).toHaveURL(/\/direction\/personnel\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Surveillant général").first()).toBeVisible();
  });
});
