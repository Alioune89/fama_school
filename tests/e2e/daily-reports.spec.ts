import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Rapport journalier", () => {
  test("la professeure envoie son rapport du jour ; la direction le lit et télécharge la semaine en PDF", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(150_000);
    const text = `Bonne journée en 6e A, fractions bien comprises (test ${Date.now().toString(36)})`;
    try {
      await loginWithPhone(page, DEMO.teacherPhone);
      await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
      await expect(page).toHaveURL(/\/professeur$/);
      await page.goto("/professeur/rapport");
      const form = page.getByRole("form", { name: "Rapport d'aujourd'hui" });
      await form.getByLabel("Votre journée en quelques lignes").fill(text);
      await form.getByRole("button", { name: /^(Envoyer|Mettre à jour) le rapport$/ }).click();
      await expect(page.getByText("Rapport enregistré.")).toBeVisible();
      await expect(form.getByRole("button", { name: "Mettre à jour le rapport" })).toBeVisible();

      const directionContext = await browser.newContext({ ...testInfo.project.use, baseURL });
      const direction = await directionContext.newPage();
      await loginWithEmail(direction, DEMO.director);
      await expect(direction).toHaveURL(/\/direction$/);
      await direction.goto("/direction/rapports");
      await expect(direction.getByRole("list", { name: "Rapports journaliers" }).getByText(text)).toBeVisible();
      const href = await direction.getByRole("link", { name: "Télécharger la semaine (PDF)" }).getAttribute("href");
      const pdf = await direction.request.get(href!);
      expect(pdf.headers()["content-type"]).toBe("application/pdf");
      expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
      await directionContext.close();
    } finally {
      await adminClient()
        .from("daily_reports")
        .delete()
        .like("body", `%${text.slice(-20)}`);
    }
  });
});
