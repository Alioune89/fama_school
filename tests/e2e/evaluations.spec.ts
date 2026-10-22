import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail, loginWithPhone } from "./helpers";

const today = () => new Date().toISOString().slice(0, 10);

test.describe("Évaluations", () => {
  test("l'enseignante crée, modifie et supprime un devoir de français", async ({ page }) => {
    const title = `Devoir test ${Date.now().toString(36)}`;
    await loginWithPhone(page, DEMO.teacherPhone);
    await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
    await expect(page).toHaveURL(/\/professeur$/);

    await page.goto("/professeur/notes");
    await expect(page.getByRole("heading", { name: "Notes", level: 1 })).toBeVisible();
    await page.getByRole("navigation", { name: "Mes classes" }).getByRole("link", { name: "6e A" }).click();
    await expect(page.getByRole("heading", { name: "6e A", level: 2 })).toBeVisible();

    await page.getByRole("button", { name: "Nouvelle évaluation : 6e A · Français" }).click();
    const sheet = page.getByRole("dialog", { name: "Nouvelle évaluation" });
    await sheet.getByRole("radio", { name: "Devoir" }).click();
    await sheet.getByLabel("Intitulé").fill(title);
    await sheet.getByLabel("Date").fill(today());
    await expect(sheet.getByLabel("Noté sur")).toHaveValue("20");
    await sheet.getByRole("button", { name: "Créer l'évaluation" }).click();
    await expect(page.getByText("Évaluation créée.")).toBeVisible();

    const list = page.getByRole("list", { name: "Évaluations : 6e A · Français" });
    const row = list.getByRole("listitem").filter({ hasText: title });
    await expect(row.getByText("Devoir", { exact: true })).toBeVisible();
    await expect(row.getByText(/sur 20/)).toBeVisible();

    // Modification : interrogation notée sur 10.
    await row.getByRole("button", { name: `Modifier « ${title} »` }).click();
    const edit = page.getByRole("dialog", { name: "Modifier l'évaluation" });
    await edit.getByRole("radio", { name: "Interrogation" }).click();
    await edit.getByLabel("Noté sur").fill("10");
    await edit.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Évaluation modifiée.")).toBeVisible();
    await expect(row.getByText("Interrogation", { exact: true })).toBeVisible();
    await expect(row.getByText(/sur 10/)).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    await row.getByRole("button", { name: `Supprimer « ${title} »` }).click();
    await expect(page.getByText("Évaluation supprimée.")).toBeVisible();
    await expect(row).toHaveCount(0);
  });

  test("la direction programme une composition et la retrouve dans le calendrier", async ({ page }) => {
    const title = `Composition test ${Date.now().toString(36)}`;
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    await page.goto("/direction/notes/compositions");
    await expect(page.getByRole("heading", { name: "Notes et bulletins", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Programmer une composition" }).click();
    const sheet = page.getByRole("dialog", { name: "Programmer une composition" });
    await sheet.getByLabel("Matière").selectOption({ label: "Français" });
    // Toutes les classes du niveau sont cochées : on ne garde que la 6e A.
    const boxes = sheet.getByRole("checkbox");
    await expect(boxes.first()).toBeVisible();
    for (const label of await sheet
      .locator("label")
      .filter({ has: page.getByRole("checkbox") })
      .allTextContents()) {
      if (label.trim() !== "6e A")
        await sheet
          .locator("label")
          .filter({ hasText: new RegExp(`^${label.trim()}$`) })
          .getByRole("checkbox")
          .click();
    }
    await sheet.getByLabel("Intitulé").fill(title);
    await sheet.getByLabel("Date").fill(today());
    await sheet.getByRole("button", { name: "Programmer pour 1 classe" }).click();
    await expect(page.getByText("Composition programmée pour 1 classe.")).toBeVisible();

    const day = page
      .getByRole("list", { name: /Calendrier des compositions/ })
      .getByRole("listitem")
      .filter({ hasText: "Français" })
      .first();
    await expect(day.getByText("6e A")).toBeVisible();

    // Elle figure dans les évaluations de la 6e A, en français ; on la supprime.
    await page.getByRole("link", { name: "Évaluations", exact: true }).filter({ visible: true }).click();
    await page.getByRole("combobox", { name: "Classe" }).filter({ visible: true }).selectOption({ label: "6e A" });
    const row = page
      .getByRole("list", { name: "Évaluations : 6e A · Français" })
      .getByRole("listitem")
      .filter({ hasText: title });
    await expect(row.getByText("Composition", { exact: true })).toBeVisible();
    page.once("dialog", (dialog) => void dialog.accept());
    await row.getByRole("button", { name: `Supprimer « ${title} »` }).click();
    await expect(page.getByText("Évaluation supprimée.")).toBeVisible();
  });
});
