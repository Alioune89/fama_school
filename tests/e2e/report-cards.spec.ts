import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail, loginWithPhone } from "./helpers";

const today = () => new Date().toISOString().slice(0, 10);

test.describe("Bulletins", () => {
  test("la direction génère les bulletins de la 6e A, les publie ; le parent consulte et télécharge", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(120_000);
    const title = `Devoir test ${Date.now().toString(36)}`;
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Une note de français pour Mariama : 15/20.
    await page.goto("/direction/notes");
    await page.getByRole("combobox", { name: "Classe" }).filter({ visible: true }).selectOption({ label: "6e A" });
    await page.getByRole("button", { name: "Nouvelle évaluation : 6e A · Français" }).click();
    const sheet = page.getByRole("dialog", { name: "Nouvelle évaluation" });
    await sheet.getByRole("radio", { name: "Devoir" }).click();
    await sheet.getByLabel("Intitulé").fill(title);
    await sheet.getByLabel("Date").fill(today());
    await sheet.getByRole("button", { name: "Créer l'évaluation" }).click();
    await expect(page.getByText("Évaluation créée.")).toBeVisible();
    await page.getByRole("link", { name: `Saisir les notes : ${title}` }).click();
    await page.getByRole("textbox", { name: "Note de Mariama Sow sur 20" }).fill("15");
    await page.getByRole("button", { name: "Enregistrer les notes" }).click();
    await expect(page.getByText(/Notes enregistrées à \d{1,2} h \d{2}/)).toBeVisible({ timeout: 40_000 });

    // Avant verrouillage, pas de bulletin.
    await page.goto("/direction/notes/bulletins");
    const classId = await page
      .getByRole("combobox", { name: "Classe" })
      .filter({ visible: true })
      .locator("option", { hasText: /^6e A$/ })
      .getAttribute("value");
    await page.goto(`/direction/notes/bulletins?classe=${classId}`);
    await expect(page.getByText(/verrouillez d'abord le/)).toBeVisible();

    // Verrouillage, puis génération.
    await page.goto(`/direction/notes/conseil?classe=${classId}`);
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: /^Verrouiller le / }).click();
    await expect(page.getByRole("region", { name: /verrouillé le/ })).toBeVisible();
    await page.goto(`/direction/notes/bulletins?classe=${classId}`);
    await page.getByRole("button", { name: /^(Générer|Régénérer) les bulletins de la classe$/ }).click();
    await expect(page.getByText(/^\d+ bulletins générés\.$/)).toBeVisible({ timeout: 30_000 });

    // Aperçu : le bulletin de Mariama, avec sa moyenne et son code de vérification.
    await page.getByRole("link", { name: "Aperçu du bulletin de Mariama Sow" }).click();
    await expect(page.getByRole("heading", { name: "Mariama Sow", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bulletin de notes" })).toBeVisible();
    const row = page.locator(".rc-table tbody tr").filter({ hasText: "Français" });
    // Colonnes : matière, coefficient, moyenne…
    await expect(row.locator("td").nth(2)).toHaveText("15,00");
    await expect(page.getByText(/Code de vérification :/).first()).toBeVisible();

    // Vérification publique, par un visiteur sans compte (adresse distincte : limites d'essais par visiteur).
    const code = (await page.locator(".rc-footer .rc-code").nth(1).textContent())!.trim();
    const visitor = await browser.newContext({
      ...testInfo.project.use,
      baseURL,
      extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}` },
    });
    const anonymous = await visitor.newPage();
    await anonymous.goto("/verifier");
    await anonymous.getByLabel("Code de vérification").fill(`${code.slice(0, 5).toLowerCase()}-${code.slice(5)}`);
    await anonymous.getByRole("button", { name: "Vérifier" }).click();
    await expect(anonymous.getByRole("heading", { name: "Bulletin authentique" })).toBeVisible();
    await expect(anonymous.getByText("Mariama SOW")).toBeVisible();
    await expect(anonymous.getByText("15,00 / 20")).toBeVisible();
    await anonymous.goto("/verifier/AAAAAAAAAA");
    await expect(anonymous.getByRole("heading", { name: "Aucun bulletin ne correspond" })).toBeVisible();
    await visitor.close();

    // Le PDF se télécharge.
    const bulletinId = page.url().split("/").at(-1)!;
    const pdf = await page.request.get(`/api/bulletins/${bulletinId}`);
    expect(pdf.ok()).toBe(true);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect(pdf.headers()["content-disposition"]).toContain("bulletin-sow-mariama-");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    // Toute la classe en un seul PDF.
    await page.getByRole("link", { name: "Retour aux bulletins" }).click();
    const classHref = await page.getByRole("link", { name: "Télécharger la classe (PDF)" }).getAttribute("href");
    const classPdf = await page.request.get(classHref!);
    expect(classPdf.headers()["content-type"]).toBe("application/pdf");
    expect(classPdf.headers()["content-disposition"]).toContain("bulletins-6e-a-");

    // Publication aux parents.
    await page.getByRole("button", { name: "Publier aux parents" }).click();
    await expect(page.getByText("Bulletins de la 6e A publiés aux parents.")).toBeVisible();

    const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const parent = await parentContext.newPage();
    await loginWithPhone(parent, DEMO.parentPhone);
    await expect(parent).toHaveURL(/\/parent$/);
    await parent.getByRole("link", { name: /Mariama Sow/ }).click();
    await parent
      .getByRole("link", { name: /^Bulletin du / })
      .first()
      .click();
    await expect(parent.getByRole("heading", { name: /^Bulletin du /, level: 1 })).toBeVisible();
    await expect(parent.locator(".rc-table tbody tr").filter({ hasText: "Français" }).locator("td").nth(2)).toHaveText("15,00");
    const parentPdf = await parent.request.get(`/api/bulletins/${bulletinId}`);
    expect(parentPdf.headers()["content-type"]).toBe("application/pdf");
    await parentContext.close();

    // Ménage : publication retirée, période rouverte, évaluation supprimée.
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Retirer la publication" }).click();
    await expect(page.getByText("Publication des bulletins de la 6e A retirée.")).toBeVisible();
    await page.goto(`/direction/notes/conseil?classe=${classId}`);
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: /^Rouvrir le / }).click();
    await expect(page.getByRole("region", { name: /notes ouvertes/ })).toBeVisible();
    await page.goto(`/direction/notes?classe=${classId}`);
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
