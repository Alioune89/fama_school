import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail } from "./helpers";

test.describe("Frais de scolarité", () => {
  test("la direction crée un frais, fixe son montant pour la 6e ; l'élève le choisit avec une bourse", async ({ page }) => {
    const name = `Cantine test ${Date.now().toString(36)}`;
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Un frais mensuel optionnel.
    await page.goto("/direction/finances/frais");
    await expect(page.getByRole("heading", { name: "Frais de scolarité", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Nouveau type de frais" }).click();
    const sheet = page.getByRole("dialog", { name: "Nouveau type de frais" });
    await sheet.getByLabel("Nature").selectOption({ label: "Cantine" });
    await expect(sheet.getByRole("radio", { name: "Par mois" })).toHaveAttribute("aria-checked", "true");
    await expect(sheet.getByRole("checkbox")).toBeChecked();
    await sheet.getByLabel("Intitulé").fill(name);
    await sheet.getByRole("button", { name: "Créer le frais" }).click();
    await expect(page.getByText("Type de frais créé.")).toBeVisible();

    // Son montant en sixième : une saisie invalide est signalée, puis corrigée.
    const amount = page.getByRole("textbox", { name: `${name} pour le niveau Sixième, en francs CFA` });
    await amount.fill("douze mille");
    await expect(page.getByText(/^1 montant invalide/)).toBeVisible();
    await amount.fill("12500");
    await amount.blur();
    await expect(amount).toHaveValue(/^12\s500$/);
    await page.getByRole("button", { name: "Enregistrer la grille" }).click();
    await expect(page.getByText("Grille des frais enregistrée.")).toBeVisible();
    await page.reload();
    await expect(amount).toHaveValue(/^12\s500$/);

    // Fiche de Mariama Sow (6e A) : elle prend l'option, avec une bourse de 50 % sur ce frais.
    await page.goto("/direction/eleves?q=Sow+Mariama");
    await page.getByRole("link", { name: "Mariama Sow" }).filter({ visible: true }).first().click();
    await expect(page.getByRole("heading", { name: "Mariama Sow", level: 1 })).toBeVisible();
    const fees = page.getByRole("region", { name: "Frais de scolarité" });
    await fees.getByRole("checkbox", { name }).click();
    // Ligne du frais, et total de l'année (c'est le seul frais) : 12 500 × 9 mois.
    await expect(fees.getByRole("definition").filter({ hasText: /^112\s500\sFCFA$/ })).toHaveCount(2);
    await fees.getByRole("combobox", { name: "Type de réduction" }).selectOption({ label: "Bourse" });
    await fees.getByRole("textbox", { name: "Pourcentage de réduction" }).fill("50");
    await fees.getByRole("combobox", { name: "Frais concerné" }).selectOption({ label: name });
    await fees.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Réduction ajoutée.")).toBeVisible();
    await expect(fees.getByText("−50 %").first()).toBeVisible();
    await expect(
      fees
        .getByRole("definition")
        .filter({ hasText: /^56\s250\sFCFA$/ })
        .first(),
    ).toBeVisible();

    // Ménage : réduction retirée, frais supprimé (montants et options avec lui).
    await fees.getByRole("button", { name: "Retirer la réduction Bourse" }).click();
    await expect(page.getByText("Réduction retirée.")).toBeVisible();
    await page.goto("/direction/finances/frais");
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: `Supprimer « ${name} »` }).click();
    await expect(page.getByText("Type de frais supprimé.")).toBeVisible();
  });
});
