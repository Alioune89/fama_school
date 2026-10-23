import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail } from "./helpers";

const today = () => new Date().toISOString().slice(0, 10);

test.describe("Conseil de classe", () => {
  test("la direction tient le conseil de la 6e A, verrouille puis rouvre la période", async ({ page }) => {
    const title = `Devoir test ${Date.now().toString(36)}`;
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Une note de français pour Mariama : 17/20.
    await page.goto("/direction/notes");
    await page.getByRole("combobox", { name: "Classe" }).filter({ visible: true }).selectOption({ label: "6e A" });
    await page.getByRole("button", { name: "Nouvelle évaluation : 6e A · Français" }).click();
    const sheet = page.getByRole("dialog", { name: "Nouvelle évaluation" });
    await sheet.getByRole("radio", { name: "Devoir" }).click();
    await sheet.getByLabel("Intitulé").fill(title);
    await sheet.getByLabel("Date").fill(today());
    await sheet.getByRole("button", { name: "Créer l'évaluation" }).click();
    await expect(page.getByText("Évaluation créée.")).toBeVisible();
    await page.getByRole("link", { name: `Saisir les notes : ${title}` }).click();
    await page.getByRole("textbox", { name: "Note de Mariama Sow sur 20" }).fill("17");
    await page.getByRole("button", { name: "Enregistrer les notes" }).click();
    await expect(page.getByText(/Notes enregistrées à \d{1,2} h \d{2}/)).toBeVisible({ timeout: 40_000 });

    // Conseil : moyenne générale, rang, mention ; avertissement, mention refusée, appréciation proposée.
    await page.goto("/direction/notes/conseil");
    await page.getByRole("combobox", { name: "Classe" }).filter({ visible: true }).selectOption({ label: "6e A" });
    const board = page.getByRole("list", { name: "Élèves de la classe, par rang" });
    const mariama = board.getByRole("listitem").filter({ hasText: "Sow Mariama" });
    await expect(mariama.getByText("17,00", { exact: true })).toBeVisible();
    await expect(mariama.getByText("1er", { exact: true })).toBeVisible();
    await expect(mariama.getByText("Félicitations")).toBeVisible();
    await mariama.getByRole("radio", { name: "Avertissement" }).click();
    await mariama.getByRole("checkbox").click();
    await mariama.getByRole("button", { name: "Choisir « Très bon travail. » pour Mariama Sow" }).click();
    await page.getByRole("button", { name: "Enregistrer le conseil" }).click();
    await expect(page.getByText("Décisions du conseil enregistrées.")).toBeVisible();
    await page.reload();
    await expect(mariama.getByRole("radio", { name: "Avertissement" })).toHaveAttribute("aria-checked", "true");
    await expect(mariama.getByRole("checkbox")).toBeChecked();
    await expect(mariama.getByRole("textbox", { name: "Appréciation générale de Mariama Sow" })).toHaveValue("Très bon travail.");

    // Verrouillage : le devoir incomplet est signalé ; après verrouillage, plus rien ne change.
    const lock = page.getByRole("region", { name: /notes ouvertes/ });
    await expect(lock.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    page.once("dialog", (dialog) => void dialog.accept());
    await lock.getByRole("button", { name: /^Verrouiller le / }).click();
    await expect(page.getByText(/verrouillé\.$/).first()).toBeVisible();
    await expect(page.getByRole("region", { name: /verrouillé le/ })).toBeVisible();
    await expect(mariama.getByRole("textbox", { name: "Appréciation générale de Mariama Sow" })).toBeDisabled();
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: /^Rouvrir le / }).click();
    await expect(page.getByRole("region", { name: /notes ouvertes/ })).toBeVisible();

    // Ménage : décision effacée, évaluation supprimée.
    await mariama.getByRole("radio", { name: "Aucune" }).click();
    await mariama.getByRole("checkbox").click();
    await mariama.getByRole("textbox", { name: "Appréciation générale de Mariama Sow" }).fill("");
    await page.getByRole("button", { name: "Enregistrer le conseil" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Décisions enregistrées." })).toBeVisible();
    await page.goto("/direction/notes");
    await page.getByRole("combobox", { name: "Classe" }).filter({ visible: true }).selectOption({ label: "6e A" });
    page.once("dialog", (dialog) => void dialog.accept());
    await page
      .getByRole("list", { name: "Évaluations : 6e A · Français" })
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: `Supprimer « ${title} »` })
      .click();
    await expect(page.getByText("Évaluation supprimée.")).toBeVisible();
  });
});
