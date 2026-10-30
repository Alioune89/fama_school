import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithEmail } from "./helpers";

test.describe("Formules (équipe Fama School)", () => {
  test("la grille, la formule conseillée et le changement de formule d'une école", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithEmail(page, DEMO.admin);
    await expect(page).toHaveURL(/\/plateforme$/);
    await page.goto("/plateforme/formules");
    await expect(page.getByRole("heading", { level: 1, name: "Formules" })).toBeVisible();
    await expect(page.getByText("Module en préparation")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Grille des formules" })).toContainText(/120\D{1,3}000\D+FCFA/);

    const baobabs = page.getByRole("listitem", { name: "Groupe Scolaire Les Baobabs" });
    await expect(baobabs.getByText(/^Pilote gratuit · ensuite : /)).toBeVisible();

    const admin = adminClient();
    try {
      const alAmine = page.getByRole("listitem", { name: "Institut Franco-Arabe Al Amine" });
      await alAmine.getByLabel("Formule de Institut Franco-Arabe Al Amine").selectOption({ label: "École" });
      await alAmine.getByRole("button", { name: "Enregistrer" }).click();
      await expect(page.getByText("Institut Franco-Arabe Al Amine : formule enregistrée.")).toBeVisible();
      // Aucun élève : la formule « Démarrage » suffit.
      await expect(alAmine.getByText("Formule conseillée : Démarrage")).toBeVisible();
      await expect(alAmine.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    } finally {
      await admin.from("schools").update({ plan: "pilot", status: "active" }).eq("slug", "al-amine");
    }
  });
});
