import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithPhone } from "./helpers";

test.describe("Messagerie", () => {
  test("le parent écrit à la professeure de français ; elle répond, la réponse arrive en direct", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(120_000);
    const subject = `Devoir de français (test ${Date.now().toString(36)})`;
    try {
      // La professeure se connecte d'abord (sur une base neuve, son compte n'existe qu'après sa première
      // connexion : avant, elle n'apparaît pas parmi les destinataires) et indique ses horaires.
      const teacherContext = await browser.newContext({ ...testInfo.project.use, baseURL });
      const teacher = await teacherContext.newPage();
      await loginWithPhone(teacher, DEMO.teacherPhone);
      await teacher.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
      await expect(teacher).toHaveURL(/\/professeur$/);
      await teacher.goto("/professeur/messages");
      for (const day of ["jeu.", "ven."]) {
        const button = teacher.getByRole("button", { name: day, exact: true });
        await expect(async () => {
          if ((await button.getAttribute("aria-pressed")) === "true") await button.click();
          await expect(button).toHaveAttribute("aria-pressed", "false", { timeout: 1500 });
        }).toPass();
      }
      await teacher.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await expect(teacher.getByText("Horaires enregistrés.")).toBeVisible();
      // Le parent de Mariama Sow (6e A) écrit à Awa Diop, professeure de français de la classe.
      await loginWithPhone(page, DEMO.parentPhone);
      await expect(page).toHaveURL(/\/parent$/);
      await page.goto("/parent/messages");
      const sheet = page.getByRole("dialog", { name: "Nouveau message" });
      await expect(async () => {
        await page.getByRole("button", { name: "Nouveau message" }).click();
        await expect(sheet).toBeVisible({ timeout: 1500 });
      }).toPass();
      await sheet.getByLabel("Enfant concerné").selectOption({ label: "Mariama Sow" });
      // « Awa Diop (Français) », ou « (professeur principal) » si elle l'est aussi.
      const recipient = sheet.getByLabel("Destinataire");
      const awa = recipient.locator("option", { hasText: "Awa Diop" });
      await expect(awa).toHaveCount(1);
      await recipient.selectOption((await awa.getAttribute("value"))!);
      await sheet.getByLabel("Objet").fill(subject);
      await sheet.getByLabel("Message").fill("Bonjour, Mariama était malade hier : quel devoir a-t-elle manqué ?");
      await sheet.getByRole("button", { name: "Envoyer" }).click();
      await expect(page).toHaveURL(/\/parent\/messages\/[0-9a-f-]{36}$/);
      await expect(page.getByRole("heading", { name: subject, level: 1 })).toBeVisible();
      await expect(page.getByText("Avec Awa Diop · au sujet de Mariama Sow")).toBeVisible();

      // La professeure retrouve la conversation et répond.
      await teacher.goto("/professeur/messages");
      const conversation = teacher.getByRole("list", { name: "Conversations" }).getByRole("link").filter({ hasText: subject });
      await expect(conversation).toContainText("Fatou Sow");
      await conversation.click();
      await expect(
        teacher.getByRole("list", { name: "Messages de la conversation" }).getByText("Mariama était malade hier"),
      ).toBeVisible();
      await teacher.getByRole("textbox", { name: "Votre réponse" }).fill("Bonjour, l'exercice 3 page 42, pour lundi.");
      await teacher.getByRole("button", { name: "Envoyer" }).click();
      await expect(
        teacher.getByRole("list", { name: "Messages de la conversation" }).getByText("l'exercice 3 page 42"),
      ).toBeVisible();
      await teacherContext.close();

      // Chez le parent, sans recharger : la réponse arrive, et les horaires de la professeure s'affichent après.
      await expect(page.getByRole("list", { name: "Messages de la conversation" }).getByText("l'exercice 3 page 42")).toBeVisible(
        { timeout: 15_000 },
      );
      await page.reload();
      await expect(page.getByText("Répond du lundi au mercredi, de 8 h à 18 h.")).toBeVisible();
    } finally {
      const admin = adminClient();
      const { data } = await admin.from("conversations").select("id").eq("subject", subject);
      for (const row of data ?? []) {
        await admin.from("notifications").delete().eq("dedupe_key", `message:${row.id}`);
        await admin.from("conversations").delete().eq("id", row.id);
      }
      const { data: teacherProfile } = await admin.from("profiles").select("id").eq("phone", "+221770000002").maybeSingle();
      if (teacherProfile) await admin.from("staff_availability").delete().eq("user_id", teacherProfile.id);
    }
  });
});
