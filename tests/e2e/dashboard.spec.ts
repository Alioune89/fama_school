import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail } from "./helpers";

test.describe("Lot 1 — tableau de bord de la direction", () => {
  test("indicateurs, effectifs par classe et calendrier scolaire", { tag: "@smoke" }, async ({ page, isMobile }) => {
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    await expect(page.getByText("Élèves inscrits", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Filles et garçons" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Calendrier scolaire" })).toBeVisible();
    await expect(page.getByText(/^Encore \d+ jours?$/)).toBeVisible();

    // Chaque classe a sa barre ; l'infobulle (survol ou clavier) donne le détail, le clic ouvre la classe.
    const row = page.getByRole("link", { name: /^CM2 A : \d+ élèves, \d+ filles et \d+ garçons$/ });
    await expect(row).toBeVisible();
    if (isMobile) await row.focus();
    else await row.hover();
    await expect(page.getByRole("tooltip")).toContainText(/\d+ élèves sur 45/);
    await row.click();
    await expect(page.getByRole("heading", { name: "CM2 A", level: 1 })).toBeVisible();
  });
});
