import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Profil du personnel", () => {
  test("le directeur voit ses rôles et change son mot de passe", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
    await page.goto("/direction/profil");
    const school = page.locator("li").filter({ hasText: "Groupe Scolaire Les Baobabs" }).filter({ visible: true });
    await expect(school.getByText("Directeur", { exact: true })).toBeVisible();
    await expect(page.getByRole("switch", { name: "Notifications sur le téléphone" })).toBeVisible();

    const change = page.getByRole("button", { name: "Changer le mot de passe" });
    await page.getByLabel("Mot de passe actuel", { exact: true }).fill("mauvais-mot-2026");
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill("Nouveau2027");
    await page.getByLabel("Confirmer le nouveau mot de passe").fill("Nouveau2028");
    await change.click();
    await expect(page.getByText("Les deux mots de passe ne sont pas identiques.")).toBeVisible();

    // L'œil affiche ce qu'on tape, puis le masque à nouveau.
    const current = page.getByLabel("Mot de passe actuel", { exact: true });
    await page.getByRole("button", { name: "Afficher le mot de passe" }).first().click();
    await expect(current).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Masquer le mot de passe" }).first().click();
    await expect(current).toHaveAttribute("type", "password");

    await page.getByLabel("Confirmer le nouveau mot de passe").fill("Nouveau2027");
    await change.click();
    await expect(page.getByText("Mot de passe actuel incorrect.")).toBeVisible();

    const admin = adminClient();
    const { data } = await admin.from("profiles").select("id").eq("email", DEMO.director).single();
    try {
      await page.getByLabel("Mot de passe actuel", { exact: true }).fill(DEMO.password);
      await change.click();
      await expect(page.getByText("Votre mot de passe est changé.")).toBeVisible();
      await expect(page.getByLabel("Mot de passe actuel", { exact: true })).toHaveValue("");
    } finally {
      await admin.auth.admin.updateUserById(data!.id, { password: DEMO.password });
    }
  });

  test("le professeur règle ses horaires de réponse depuis son profil", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithPhone(page, DEMO.teacherPhone);
    await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
    await expect(page).toHaveURL(/\/professeur$/);
    await page.goto("/professeur/profil");
    await expect(page.getByRole("heading", { name: "Mes écoles et mes rôles" })).toBeVisible();
    const school = page.locator("li").filter({ hasText: "Groupe Scolaire Les Baobabs" }).filter({ visible: true });
    await expect(school.getByText("Enseignant", { exact: true })).toBeVisible();
    // Compte par téléphone : pas de mot de passe à changer.
    await expect(page.getByRole("button", { name: "Changer le mot de passe" })).toHaveCount(0);
    const hours = page.getByRole("region", { name: "Mes horaires de réponse" });
    await hours.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Horaires enregistrés.")).toBeVisible();
  });
});
