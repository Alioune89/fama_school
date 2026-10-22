import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail } from "./helpers";

test.describe("Présences côté direction", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
  });

  test("la direction fait l'appel d'une classe puis le retrouve dans la journée et la grille", async ({ page }) => {
    // Identifiant de la 3e A depuis la liste des classes.
    await page.goto("/direction/classes");
    const href = await page.getByRole("link", { name: /3e A/ }).getAttribute("href");
    const classId = href!.split("/").at(-1)!;

    await page.goto(`/direction/presences/appel/${classId}`);
    const students = page.getByRole("list", { name: "Élèves de la classe" }).getByRole("button");
    await expect(students.first()).toBeVisible();
    const allPresent = page.getByRole("button", { name: "Tous présents" });
    await expect(async () => {
      if (await allPresent.isVisible()) await allPresent.click();
      await expect(page.getByText(/· 0 absent · 0 en retard/)).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await expect(async () => {
      await students.first().click();
      await expect(students.first()).toHaveAttribute("aria-label", /: Absent$/, { timeout: 1_000 });
    }).toPass();
    const name = (await students.first().getAttribute("aria-label"))!.replace(/ : Absent$/, "");
    await page.getByRole("button", { name: /Valider l'appel|Enregistrer les modifications/ }).click();
    await expect(page.getByText(/Appel envoyé à \d{1,2} h \d{2}/)).toBeVisible();

    await page.getByRole("link", { name: "Présences du jour" }).click();
    await expect(page.getByRole("heading", { name: "Présences", level: 1 })).toBeVisible();
    await expect(page.getByText("Taux de présence")).toBeVisible();
    const row = page
      .getByRole("row", { name: /3e A/ })
      .or(page.getByRole("listitem", { name: "3e A" }))
      .filter({ visible: true });
    await expect(row.getByText("1 absent")).toBeVisible();
    await expect(row.getByText("Moussa Ndiaye").first()).toBeVisible();
    await expect(page.getByRole("region", { name: /Absents et retards/ }).getByText(name)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Absences répétées" })).toBeVisible();

    // Correction : l'élève absent est finalement arrivé en retard. Le journal garde les deux envois.
    await page.goto(`/direction/presences/appel/${classId}`);
    await expect(async () => {
      if (!(await students.first().getAttribute("aria-label"))?.endsWith(": En retard")) await students.first().click();
      await expect(students.first()).toHaveAttribute("aria-label", /: En retard$/, { timeout: 1_000 });
    }).toPass();
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    await expect(page.getByText(/Appel envoyé à \d{1,2} h \d{2}/)).toBeVisible();

    await page.goto("/direction/presences");
    await page.getByRole("link", { name: "Historique", exact: true }).first().click();
    await expect(page).toHaveURL(/\/direction\/presences\/historique/);
    const latest = page.getByRole("list", { name: "Appels envoyés" }).getByRole("listitem").first();
    await expect(latest.getByText(/^3e A · /)).toBeVisible();
    await expect(latest.getByText("Correction")).toBeVisible();
    await expect(latest.getByText("Moussa Ndiaye")).toBeVisible();
    await expect(latest.getByText(/fait le \S+ \d{1,2} \S+ à \d{1,2} h \d{2} · reçu à/)).toBeVisible();
    const change = latest.getByRole("list", { name: "Élèves concernés" }).getByRole("listitem").filter({ hasText: name });
    await expect(change.getByText("Absent")).toBeVisible();
    await expect(change.getByText("En retard")).toBeVisible();

    // La page Historique reste montée (masquée) : attendre la grille avant de choisir la classe.
    await page.getByRole("link", { name: "Grille du mois" }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/direction\/presences\/grille$/);
    await expect(page.getByText("Présence de chaque élève, jour par jour, sur un mois.")).toBeVisible();
    await page.getByRole("combobox", { name: "Classe" }).filter({ visible: true }).selectOption({ label: "3e A" });
    await expect(page).toHaveURL(new RegExp(`classe=${classId}`));
    await expect(page.getByRole("img", { name: new RegExp(`^${name}, .* : .*en retard`) }).first()).toBeVisible();
  });

  test("on remonte aux jours précédents", async ({ page }) => {
    await page.goto("/direction/presences");
    await page.getByRole("button", { name: "Jour précédent" }).click();
    await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole("button", { name: "Aujourd'hui" })).toBeVisible();
  });
});
