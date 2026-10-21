import { expect, test } from "@playwright/test";
import { DEMO, loginWithPhone } from "./helpers";

test.describe("Signalements", () => {
  test("l'enseignante signale une élève ; le parent voit le signalement avec toutes les informations", async ({ browser }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const message = `Fièvre vers 10 h, mise au repos (test ${Date.now().toString(36)})`;

    // L'enseignante (Awa Diop, 6e A) signale Mariama Sow.
    const teacherContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const teacher = await teacherContext.newPage();
    await loginWithPhone(teacher, DEMO.teacherPhone);
    await expect(teacher).toHaveURL(/\/choisir-espace$/);
    await teacher.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
    await expect(teacher).toHaveURL(/\/professeur$/);

    await teacher.goto("/professeur/signalements");
    await expect(teacher.getByRole("heading", { name: "Signalements", level: 1 })).toBeVisible();
    await teacher.getByLabel("Classe").selectOption({ label: "6e A" });
    await teacher.getByLabel("Élève", { exact: true }).selectOption({ label: "Sow Mariama" });
    await teacher.getByRole("radio", { name: "Santé" }).click();
    await teacher.getByLabel("Motif").fill(message);
    await teacher.getByRole("button", { name: "Envoyer le signalement" }).click();
    await expect(teacher.getByText("Signalement de Mariama Sow envoyé.", { exact: false })).toBeVisible();

    // Une fois parti, il figure dans « Mes derniers signalements ».
    await expect(async () => {
      await teacher.reload();
      await expect(teacher.getByRole("list", { name: "Signalements" }).getByText(message)).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await teacherContext.close();

    // Le parent (Fatou Sow) le voit dans la fiche de sa fille.
    const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const parent = await parentContext.newPage();
    await loginWithPhone(parent, DEMO.parentPhone);
    await expect(parent).toHaveURL(/\/parent$/);
    await parent.getByRole("link", { name: /Mariama Sow/ }).click();
    await expect(parent).toHaveURL(/\/parent\/enfants\/[0-9a-f-]{36}$/);
    await expect(parent.getByRole("heading", { name: "Mariama Sow", level: 1 })).toBeVisible();

    const report = parent.getByRole("list", { name: "Signalements" }).getByRole("listitem").filter({ hasText: message });
    await expect(report.getByText("Santé")).toBeVisible();
    await expect(report.getByText("Par Awa Diop · 6e A")).toBeVisible();
    await expect(report.getByText(/^le \S+ \d{1,2} \S+ à \d{1,2} h \d{2}$/)).toBeVisible();
    await expect(parent.getByRole("heading", { name: /Absences et retards/ })).toBeVisible();
    await parentContext.close();
  });
});
