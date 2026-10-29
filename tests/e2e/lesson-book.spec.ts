import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Cahier de textes", () => {
  test("la professeure note une séance et un devoir ; le parent est prévenu et le voit ; la direction le consulte", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(150_000);
    const stamp = Date.now().toString(36);
    const content = `Lecture du conte « Kumba l'orpheline » (test ${stamp})`;
    const homework = `Résumer le conte en cinq lignes (test ${stamp})`;
    const due = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    try {
      // Le parent se connecte d'abord : son compte reçoit la notification du devoir.
      const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL });
      const parent = await parentContext.newPage();
      await loginWithPhone(parent, DEMO.parentPhone);
      await expect(parent).toHaveURL(/\/parent$/);

      await loginWithPhone(page, DEMO.teacherPhone);
      await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
      await expect(page).toHaveURL(/\/professeur$/);
      await page.goto("/professeur/cahier-de-textes");
      await page.getByRole("combobox", { name: "Classe et matière" }).selectOption({ label: "6e A · Français" });
      await expect(page).toHaveURL(/cours=/);
      const form = page.getByRole("form", { name: "Nouvelle séance" });
      await form.getByLabel("Ce qui a été fait").fill(content);
      const toggle = form.getByRole("switch", { name: "Donner un devoir" });
      await expect(async () => {
        await toggle.click();
        await expect(toggle).toBeChecked({ timeout: 1500 });
      }).toPass();
      await form.getByLabel("Devoir", { exact: true }).fill(homework);
      await form.getByLabel("Pour le").fill(due);
      await form.getByRole("button", { name: "Enregistrer la séance" }).click();
      await expect(page.getByText("Séance et devoir enregistrés : les parents sont prévenus.")).toBeVisible();
      await expect(page.getByRole("list", { name: "Séances du cahier de textes" }).getByText(content)).toBeVisible();

      // Chez le parent : la cloche, puis la page Devoirs.
      await parent.reload();
      await parent.getByRole("button", { name: /^Notifications : \d+ non lues?$/ }).click();
      await parent
        .getByRole("menuitem", { name: /Nouveau devoir de Français/ })
        .first()
        .click();
      await expect(parent).toHaveURL(/\/parent\/devoirs$/);
      await expect(parent.getByRole("list", { name: "Devoirs à faire de Mariama" }).getByText(homework)).toBeVisible();
      await parentContext.close();

      // La direction consulte le cahier de textes de la 6e A.
      const directionContext = await browser.newContext({ ...testInfo.project.use, baseURL });
      const direction = await directionContext.newPage();
      await loginWithEmail(direction, DEMO.director);
      await expect(direction).toHaveURL(/\/direction$/);
      await direction.goto("/direction/cahier-de-textes");
      await direction.getByRole("combobox", { name: "Classe", exact: true }).selectOption({ label: "6e A" });
      await expect(direction.getByText(content)).toBeVisible();
      await directionContext.close();
    } finally {
      const admin = adminClient();
      const { data } = await admin.from("lesson_entries").select("id").like("content", `%(test ${stamp})`);
      for (const row of data ?? []) {
        await admin.from("notifications").delete().eq("dedupe_key", `homework:${row.id}`);
        await admin.from("lesson_entries").delete().eq("id", row.id);
      }
    }
  });
});
