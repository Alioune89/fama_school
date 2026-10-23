import { expect, test } from "@playwright/test";
import { DEMO, loginWithPhone } from "./helpers";

const today = () => new Date().toISOString().slice(0, 10);

test.describe("Saisie des notes", () => {
  test("l'enseignante saisit les notes, hors ligne compris, les publie ; le parent les voit", async ({
    page,
    context,
    browser,
    baseURL,
  }, testInfo) => {
    const title = `Devoir test ${Date.now().toString(36)}`;
    await loginWithPhone(page, DEMO.teacherPhone);
    await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
    await expect(page).toHaveURL(/\/professeur$/);

    // Un devoir de français en 6e A, noté sur 20.
    await page.goto("/professeur/notes");
    await page.getByRole("navigation", { name: "Mes classes" }).getByRole("link", { name: "6e A" }).click();
    await page.getByRole("button", { name: "Nouvelle évaluation : 6e A · Français" }).click();
    const sheet = page.getByRole("dialog", { name: "Nouvelle évaluation" });
    await sheet.getByRole("radio", { name: "Devoir" }).click();
    await sheet.getByLabel("Intitulé").fill(title);
    await sheet.getByLabel("Date").fill(today());
    await sheet.getByRole("button", { name: "Créer l'évaluation" }).click();
    await expect(page.getByText("Évaluation créée.")).toBeVisible();

    await page.getByRole("link", { name: `Saisir les notes : ${title}` }).click();
    await expect(page.getByRole("heading", { name: "Saisie des notes", level: 1 })).toBeVisible();
    await expect(page.getByText(title).filter({ visible: true })).toBeVisible();

    // Au clavier : une note invalide est signalée, Entrée passe à l'élève suivant, « a » marque absent.
    const mariama = page.getByRole("textbox", { name: "Note de Mariama Sow sur 20" });
    await mariama.fill("25");
    await expect(page.getByText("Note invalide : entre 0 et 20, deux décimales au plus.")).toBeVisible();
    await expect(page.getByText("1 note à corriger avant d'enregistrer.")).toBeVisible();
    await mariama.fill("14,5");
    await mariama.press("Enter");
    const row = Number(await mariama.getAttribute("data-grade-row"));
    const next = page.locator(`[data-grade-row="${row + 1}"]`);
    await expect(next).toBeFocused();
    await next.pressSequentially("a");
    await expect(next).toHaveAttribute("placeholder", "Abs.");
    await expect(page.getByText(/^1 note · 1 absent · \d+ élèves sans note$/)).toBeVisible();

    await page.getByRole("button", { name: "Enregistrer les notes" }).click();
    await expect(page.getByText(/Notes enregistrées à \d{1,2} h \d{2}/)).toBeVisible({ timeout: 40_000 });

    // Sans réseau : la correction reste sur le téléphone, puis part au retour du réseau.
    await context.setOffline(true);
    await mariama.fill("15");
    await page.getByRole("button", { name: "Enregistrer les notes" }).click();
    await expect(page.getByText("Enregistré sur le téléphone : envoi dès le retour du réseau.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publier aux parents" })).toBeDisabled();
    await context.setOffline(false);
    await expect(page.getByText(/Notes enregistrées à \d{1,2} h \d{2}/)).toBeVisible({ timeout: 40_000 });

    await page.reload();
    await expect(mariama).toHaveValue("15");

    await page.getByRole("button", { name: "Publier aux parents" }).click();
    await expect(page.getByText("Notes publiées aux parents.")).toBeVisible();
    await expect(page.getByText(/Publiée aux parents le/)).toBeVisible();

    // Le parent de Mariama voit la note publiée.
    const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const parent = await parentContext.newPage();
    await loginWithPhone(parent, DEMO.parentPhone);
    await expect(parent).toHaveURL(/\/parent$/);
    await parent.getByRole("link", { name: /Mariama Sow/ }).click();
    const grades = parent.getByRole("region", { name: /^Notes/ });
    // La ligne du devoir (pas la carte de la matière qui la contient).
    const line = grades.getByRole("listitem").filter({ hasText: title, hasNot: parent.getByRole("list") });
    await expect(line.getByText("15/20")).toBeVisible();
    await parentContext.close();

    // Ménage : l'évaluation et ses notes.
    await page.getByRole("link", { name: "Retour aux évaluations" }).click();
    page.once("dialog", (dialog) => void dialog.accept());
    await page
      .getByRole("list", { name: "Évaluations : 6e A · Français" })
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: `Supprimer « ${title} »` })
      .click();
    await expect(page.getByText("Évaluation supprimée.")).toBeVisible();
  });
});
