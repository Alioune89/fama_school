import { expect, test } from "@playwright/test";
import { clickUntilVisible, DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Annonces et calendrier", () => {
  test("la direction publie pour la 6e A et ajoute des vacances ; le parent les reçoit", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(120_000);
    const stamp = Date.now().toString(36);
    const title = `Sortie au musée (test ${stamp})`;
    const holiday = `Vacances test ${stamp}`;
    page.on("dialog", (dialog) => void dialog.accept());
    // Le parent de Mariama (6e A) se connecte d'abord : sur une base neuve, son compte n'existe qu'après sa
    // première connexion, et une annonce ne va qu'aux parents qui ont un compte.
    const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const parent = await parentContext.newPage();
    await loginWithPhone(parent, DEMO.parentPhone);
    await expect(parent).toHaveURL(/\/parent$/);

    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Annonce aux parents de la 6e A.
    await page.goto("/direction/annonces");
    const sheet = page.getByRole("dialog", { name: "Nouvelle annonce" });
    await clickUntilVisible(page.getByRole("button", { name: "Nouvelle annonce" }), sheet);
    await sheet.getByRole("radio", { name: /Parents de certaines classes/ }).click();
    await sheet.getByRole("checkbox", { name: "6e A" }).click();
    await sheet.getByLabel("Titre").fill(title);
    await sheet.getByLabel("Message").fill("Lundi matin, départ à 8 h devant l'école.");
    await sheet.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByText(/^Annonce publiée : \d+ destinataires? prévenus?\.$/)).toBeVisible();
    const article = page.getByRole("article", { name: title });
    await expect(article.getByText(/^Parents de 6e A · \d+ destinataires?$/)).toBeVisible();

    // Vacances au calendrier, dans 20 jours.
    const start = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 27 * 86_400_000).toISOString().slice(0, 10);
    await page.goto("/direction/calendrier");
    const eventSheet = page.getByRole("dialog", { name: "Nouvel événement" });
    await clickUntilVisible(page.getByRole("button", { name: "Nouvel événement" }), eventSheet);
    await eventSheet.getByLabel("Type").selectOption({ label: "Vacances" });
    await eventSheet.getByLabel("Titre").fill(holiday);
    await eventSheet.getByLabel("Du").fill(start);
    await eventSheet.getByLabel("Au (facultatif)").fill(end);
    await eventSheet.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText("Événement ajouté au calendrier.")).toBeVisible();
    await expect(page.getByText(holiday)).toBeVisible();

    // Chez le parent : la cloche, la page Annonces, le calendrier.
    await parent.reload();
    await parent.getByRole("button", { name: /^Notifications : \d+ non lues?$/ }).click();
    await parent.getByRole("menuitem", { name: new RegExp(title.replace(/[()]/g, "\\$&")) }).click();
    await expect(parent).toHaveURL(/\/parent\/annonces$/);
    await expect(parent.getByRole("article", { name: title })).toContainText("départ à 8 h");
    await parent.goto("/parent/calendrier");
    await expect(parent.getByText(holiday)).toBeVisible();
    await parentContext.close();

    // Ménage : l'événement et l'annonce sont supprimés.
    await page.getByRole("button", { name: `Supprimer « ${holiday} »` }).click();
    await expect(page.getByText("Événement supprimé.")).toBeVisible();
    await page.goto("/direction/annonces");
    await page.getByRole("button", { name: `Supprimer « ${title} »` }).click();
    await expect(page.getByText("Annonce supprimée.")).toBeVisible();
  });
});
