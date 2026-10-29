import { expect, test } from "@playwright/test";
import { DEMO, loginWithPhone } from "./helpers";

test.describe("Tableau de bord du professeur", () => {
  test("chiffres du jour, classes et appels, notes à finir, messages", async ({ page }) => {
    await loginWithPhone(page, DEMO.teacherPhone);
    await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
    await expect(page).toHaveURL(/\/professeur$/);
    await expect(page.getByRole("heading", { name: "Mon tableau de bord", level: 1 })).toBeVisible();
    const figures = page.getByRole("region", { name: "Chiffres du jour" });
    await expect(figures.getByText("Mes classes")).toBeVisible();
    await expect(figures.getByText("Appels du matin faits")).toBeVisible();
    // Ses classes avec l'état de l'appel ; un clic mène à l'appel de la classe.
    const classes = page.getByRole("region", { name: "Mes classes aujourd'hui" });
    await classes.getByRole("link", { name: /6e A/ }).first().click();
    await expect(page).toHaveURL(/\/professeur\/appel\/[0-9a-f-]{36}/);
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Notes à saisir ou publier" })).toBeVisible();
    await page.getByRole("link", { name: /conversations? non lues?|Aucun message non lu/ }).click();
    await expect(page).toHaveURL(/\/professeur\/messages$/);
  });
});
