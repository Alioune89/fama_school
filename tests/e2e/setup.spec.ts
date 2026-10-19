import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Lot 1 — création et mise en route d'une école", () => {
  test("l'équipe Fama School crée une école et invite son directeur", async ({ page }) => {
    const suffix = Date.now().toString(36);
    await loginWithEmail(page, DEMO.admin);
    await page.getByRole("link", { name: "Nouvelle école" }).click();
    await expect(page.getByRole("heading", { name: "Nouvelle école", level: 1 })).toBeVisible();

    await page.getByLabel("Nom de l'école").fill(`Cours Privés Test ${suffix}`);
    await expect(page.getByLabel("Identifiant")).toHaveValue(`cours-prives-test-${suffix}`);
    await page.getByLabel("Ville", { exact: true }).fill("Rufisque");
    await page.getByLabel("Nom complet", { exact: true }).fill("Directrice Test");
    await page.getByLabel("Téléphone", { exact: true }).fill("70 888 00 01");
    await page.getByRole("button", { name: "Créer l'école" }).click();

    await expect(page).toHaveURL(/\/plateforme$/);
    await expect(page.getByRole("cell", { name: new RegExp(`Cours Privés Test ${suffix}`) })).toBeVisible();
  });

  test("le directeur d'une école vide la met en route en six étapes", async ({ page }) => {
    await loginWithPhone(page, DEMO.alAmineDirectorPhone);
    await expect(page).toHaveURL(/\/direction$/);

    await page.goto("/direction/parametres");
    await expect(page.getByRole("heading", { name: "Paramètres", level: 1 })).toBeVisible();

    // Étape 2 — année scolaire (dates proposées automatiquement)
    await page.goto("/direction/parametres/annee");
    await page.getByRole("radio", { name: "Semestres" }).click();
    await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
    await expect(page).toHaveURL(/\/parametres\/niveaux$/);

    // Étape 3 — cycles et niveaux, filière franco-arabe
    const elementaire = page.getByRole("checkbox", { name: /Élémentaire/ });
    if ((await elementaire.getAttribute("aria-checked")) !== "true") await elementaire.click();
    const moyen = page.getByRole("checkbox", { name: /^Moyen/ });
    if ((await moyen.getAttribute("aria-checked")) !== "true") await moyen.click();
    const francoArabe = page.getByRole("switch");
    if ((await francoArabe.getAttribute("aria-checked")) !== "true") await francoArabe.click();
    await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
    await expect(page).toHaveURL(/\/parametres\/matieres$/);

    // Étape 4 — matières usuelles et filière arabe
    await page.getByRole("button", { name: "Pré-remplir avec les matières usuelles" }).click();
    await page.getByRole("tab", { name: "Moyen" }).click();
    await expect(page.getByRole("textbox", { name: "Matière" }).first()).toBeVisible();
    const subjectNames = await page
      .getByRole("textbox", { name: "Matière" })
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
    expect(subjectNames).toEqual(expect.arrayContaining(["Mathématiques", "Coran", "Langue arabe"]));
    await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
    await expect(page).toHaveURL(/\/parametres\/classes$/);

    // Étape 5 — une classe par niveau
    await expect(page.getByText("+ CM2 A").or(page.getByText("CM2 A", { exact: true }))).toBeVisible();
    await page.getByRole("button", { name: "Créer les classes" }).click();
    await expect(page).toHaveURL(/\/parametres\/evaluation$/);

    // Étape 6 — mentions et pondérations
    await expect(page.getByText(/moyenne 11,5\/20/)).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/direction\/parametres$/);

    await expect(page.getByText("6 étapes sur 6 terminées")).toBeVisible();
    await expect(page.getByText("Votre école est prête")).toBeVisible();
  });
});
