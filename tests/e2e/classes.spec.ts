import { expect, test, type Locator, type Page } from "@playwright/test";
import { DEMO, loginWithEmail } from "./helpers";

/** Texte visible (les pages précédentes restent en mémoire, masquées). */
const visibleText = (page: Page, text: string) => page.getByText(text).filter({ visible: true }).first();

/** Choisit l'option dont le libellé commence par… (l'effectif affiché varie d'une exécution à l'autre). */
async function selectByPrefix(select: Locator, prefix: string) {
  const value = await select.evaluate(
    (element, start) => [...(element as HTMLSelectElement).options].find((option) => option.label.startsWith(start))?.value ?? "",
    prefix,
  );
  expect(value, `option « ${prefix} »`).not.toBe("");
  await select.selectOption(value);
}

function uniquePhone() {
  const digits = String(Date.now()).slice(-7);
  return `78 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)}`;
}

test.describe("Lot 1 — classes et parcours des élèves", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
  });

  test("la liste des classes mène à la fiche, où l'on modifie la classe et affecte un professeur", async ({ page }) => {
    await page.goto("/direction/classes");
    await expect(page.getByRole("heading", { name: "Classes", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /^CM1 A/ }).click();

    await expect(page).toHaveURL(/\/direction\/classes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "CM1 A", level: 1 })).toBeVisible();

    const room = `Salle ${Date.now().toString(36).slice(-3)}`;
    await page.getByRole("button", { name: "Modifier" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Salle").fill(room);
    await sheet.getByLabel("Capacité").fill("40");
    await sheet.getByRole("button", { name: "Enregistrer" }).click();
    await expect(visibleText(page, room)).toBeVisible();
    await expect(visibleText(page, "/ 40 élèves")).toBeVisible();

    const teacherSelect = page.getByRole("combobox", { name: /^Professeur de / }).first();
    const current = await teacherSelect.inputValue();
    const next = await teacherSelect.evaluate(
      (element, value) =>
        [...(element as HTMLSelectElement).options].find((option) => option.value && option.value !== value)?.value ?? "",
      current,
    );
    await teacherSelect.selectOption(next);
    await expect(visibleText(page, "Professeur affecté.")).toBeVisible();
    await expect(teacherSelect).toHaveValue(next);
  });

  test("inscrire depuis la classe, changer de classe, enregistrer puis annuler un départ", async ({ page }) => {
    await page.goto("/direction/classes");
    await page.getByRole("link", { name: /^CE1 A/ }).click();
    await expect(page.getByRole("heading", { name: "CE1 A", level: 1 })).toBeVisible();

    const firstName = `Parcours${Date.now().toString(36)}`;
    await page.getByRole("button", { name: "Inscrire un élève" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByLabel("Classe")).toHaveValue(/[0-9a-f-]{36}/);
    await sheet.getByLabel("Nom", { exact: true }).fill("Sarr");
    await sheet.getByLabel("Prénom(s)").fill(firstName);
    await sheet.getByLabel("Sexe").selectOption("M");
    await sheet.getByLabel("Nom complet").fill("Babacar Sarr");
    await sheet.getByLabel("Téléphone").fill(uniquePhone());
    await sheet.getByRole("button", { name: "Inscrire", exact: true }).click();
    await expect(page.getByRole("heading", { name: `${firstName} Sarr`, level: 1 })).toBeVisible();
    await expect(visibleText(page, "CE1 A · ")).toBeVisible();

    await page.getByRole("button", { name: "Changer de classe" }).click();
    const move = page.getByRole("dialog");
    await selectByPrefix(move.getByLabel("Classe"), "CE2 A");
    await move.getByRole("button", { name: "Valider" }).click();
    await expect(visibleText(page, "CE2 A · ")).toBeVisible();

    await page.getByRole("button", { name: "Enregistrer un départ" }).click();
    const departure = page.getByRole("dialog");
    await departure.getByLabel("Motif").selectOption("transferred");
    await departure.getByRole("button", { name: "Enregistrer le départ" }).click();
    await expect(visibleText(page, "Transféré le")).toBeVisible();

    await page.getByRole("button", { name: "Annuler le départ" }).click();
    await expect(visibleText(page, "CE2 A · ")).toBeVisible();
  });
});
