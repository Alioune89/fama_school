import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail } from "./helpers";

test.describe("Fiche école (équipe Fama School)", () => {
  test("la liste montre l'activité et ouvre la fiche avec contact, mise en route et équipe", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithEmail(page, DEMO.admin);
    await expect(page).toHaveURL(/\/plateforme$/);

    const table = page.getByRole("table");
    await expect(table.getByRole("columnheader", { name: "Activité" })).toBeVisible();
    const baobabs = table.getByRole("row").filter({ hasText: "Groupe Scolaire Les Baobabs" });
    await expect(baobabs.getByText(/^(Mise en route|Régulière|Ralentit|À l'arrêt)$/)).toBeVisible();

    await baobabs.getByRole("link", { name: "Groupe Scolaire Les Baobabs" }).click();
    await expect(page).toHaveURL(/\/plateforme\/ecoles\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Groupe Scolaire Les Baobabs" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Activité des 7 derniers jours" })).toBeVisible();
    for (const label of ["Élèves actifs", "Appels faits", "Notes saisies", "Encaissements", "Parents connectés"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    const contact = page.getByRole("region", { name: "Contact" });
    await expect(contact.getByText("Moussa Ndiaye")).toBeVisible();

    const setup = page.getByRole("region", { name: "Mise en route" });
    await expect(setup.getByText(/^\d étapes sur 6$/)).toBeVisible();
    await expect(setup.getByText("Identité de l'école")).toBeVisible();

    const team = page.getByRole("region", { name: "Équipe" });
    await expect(team.getByText("Moussa Ndiaye")).toBeVisible();
    await expect(team.getByText("Cheikh Ba")).toBeVisible();

    await page.getByRole("link", { name: "Toutes les écoles" }).click();
    await expect(page).toHaveURL(/\/plateforme$/);
  });

  test("une fiche inconnue affiche la page introuvable", async ({ page }) => {
    await loginWithEmail(page, DEMO.admin);
    await expect(page).toHaveURL(/\/plateforme$/);
    await page.goto("/plateforme/ecoles/00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  });
});
