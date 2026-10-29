import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Programme et progression", () => {
  test("la professeure rédige et avance ; la direction valide ; le parent voit la progression", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(150_000);
    const stamp = Date.now().toString(36);
    const first = `Le conte (test ${stamp})`;
    const second = `La poésie (test ${stamp})`;
    try {
      // La professeure de français de la 6e A rédige deux chapitres et termine le premier.
      await loginWithPhone(page, DEMO.teacherPhone);
      await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
      await expect(page).toHaveURL(/\/professeur$/);
      await page.goto("/professeur/programme");
      await page.getByRole("combobox", { name: "Classe et matière" }).selectOption({ label: "6e A · Français" });
      await expect(page).toHaveURL(/cours=/);
      const sheet = page.getByRole("dialog", { name: "Ajouter des chapitres" });
      await expect(async () => {
        await page.getByRole("button", { name: "Ajouter des chapitres" }).click();
        await expect(sheet).toBeVisible({ timeout: 1500 });
      }).toPass();
      await sheet.getByLabel("Chapitres").fill(`${first}\n${second}`);
      await sheet.getByRole("button", { name: "Ajouter", exact: true }).click();
      await expect(page.getByText("2 chapitres ajoutés.")).toBeVisible();
      const status = page.getByRole("radiogroup", { name: `Avancement : ${first}` });
      await status.getByRole("radio", { name: "En cours" }).click();
      await expect(status.getByRole("radio", { name: "En cours" })).toHaveAttribute("aria-checked", "true");
      await status.getByRole("radio", { name: "Terminé" }).click();
      await expect(status.getByRole("radio", { name: "Terminé" })).toHaveAttribute("aria-checked", "true");

      // La direction le retrouve parmi les chapitres à valider, et le valide.
      const directionContext = await browser.newContext({ ...testInfo.project.use, baseURL });
      const direction = await directionContext.newPage();
      await loginWithEmail(direction, DEMO.director);
      await expect(direction).toHaveURL(/\/direction$/);
      await direction.goto("/direction/programme");
      await direction.getByRole("link", { name: new RegExp(first.replace(/[()]/g, "\\$&")) }).click();
      await expect(direction.getByRole("heading", { name: "Français · 6e A", level: 1 })).toBeVisible();
      await direction.getByRole("button", { name: `Valider le chapitre « ${first} »` }).click();
      await expect(direction.getByText("Chapitre validé.")).toBeVisible();
      await expect(direction.getByRole("listitem").filter({ hasText: first }).getByText("Validé")).toBeVisible();
      await directionContext.close();

      // Le parent de Mariama Sow (6e A) voit la progression en français.
      const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL });
      const parent = await parentContext.newPage();
      await loginWithPhone(parent, DEMO.parentPhone);
      await expect(parent).toHaveURL(/\/parent$/);
      await parent.getByRole("link", { name: /Mariama Sow/ }).click();
      const programme = parent.getByRole("region", { name: "Programme de l'année" });
      await expect(programme.getByText("Français")).toBeVisible();
      await expect(programme.getByText(/^\d+\/\d+ chapitres terminés$/).first()).toBeVisible();
      await parentContext.close();
    } finally {
      await adminClient().from("programme_chapters").delete().like("title", `%(test ${stamp})`);
    }
  });
});
