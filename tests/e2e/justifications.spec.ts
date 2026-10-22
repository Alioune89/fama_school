import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail, loginWithPhone } from "./helpers";

// Image PNG de 1 × 1 pixel : la « photo » du certificat.
const PHOTO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("Justificatifs d'absence", () => {
  test("le parent envoie un certificat en photo ; la direction l'accepte ; le parent voit la décision", async ({
    browser,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const comment = `Fièvre, consultation au poste de santé (test ${Date.now().toString(36)})`;

    // Le parent (Fatou Sow) justifie une absence de Mariama.
    const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const parent = await parentContext.newPage();
    await loginWithPhone(parent, DEMO.parentPhone);
    await expect(parent).toHaveURL(/\/parent$/);
    await parent.getByRole("link", { name: /Mariama Sow/ }).click();
    await expect(parent.getByRole("heading", { name: "Mariama Sow", level: 1 })).toBeVisible();
    const childUrl = parent.url();

    await parent.getByRole("link", { name: "Justifier une absence" }).click();
    await expect(parent.getByRole("heading", { name: "Justifier une absence", level: 1 })).toBeVisible();
    await parent.getByRole("button", { name: "Envoyer le justificatif" }).click();
    await expect(parent.getByText("Choisissez le motif de l'absence.")).toBeVisible();
    await expect(parent.getByText("Joignez une photo ou écrivez une explication.")).toBeVisible();

    await parent.getByRole("radio", { name: "Maladie" }).click();
    await parent.getByLabel(/^Explication/).fill(comment);
    await parent.locator('input[type="file"]').setInputFiles({ name: "certificat.png", mimeType: "image/png", buffer: PHOTO });
    await expect(parent.getByRole("img", { name: "Photo du mot ou du certificat" })).toBeVisible();
    await parent.getByRole("button", { name: "Envoyer le justificatif" }).click();
    await expect(parent.getByText("Justificatif envoyé. La direction va l'examiner.")).toBeVisible();
    await expect(parent).toHaveURL(childUrl);

    const sent = parent.getByRole("list", { name: "Justificatifs" }).getByRole("listitem").filter({ hasText: comment });
    await expect(sent.getByText("En attente")).toBeVisible();
    await expect(sent.getByText("Maladie")).toBeVisible();
    await sent.getByRole("button", { name: "Voir la photo" }).click();
    const viewer = parent.getByRole("dialog", { name: "Voir la photo" });
    await expect(viewer.getByRole("img", { name: "Voir la photo" })).toBeVisible();
    await viewer.getByRole("button", { name: "Fermer" }).first().click();
    await expect(viewer).toHaveCount(0);
    await expect(sent.getByRole("button", { name: "Retirer" })).toBeVisible();

    // La direction le trouve dans Présences › Justificatifs et l'accepte.
    const directorContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const director = await directorContext.newPage();
    await loginWithEmail(director, DEMO.director);
    await expect(director).toHaveURL(/\/direction$/);
    await director.goto("/direction/presences");
    await expect(director.getByRole("link", { name: /justificatifs? à traiter/ })).toBeVisible();
    await director.getByRole("link", { name: "Justificatifs", exact: true }).click();
    await expect(director).toHaveURL(/\/direction\/presences\/justificatifs$/);

    const item = director.getByRole("list", { name: "Justificatifs" }).getByRole("listitem").filter({ hasText: comment });
    await expect(item.getByRole("link", { name: "Mariama Sow", exact: true })).toBeVisible();
    await expect(item.getByText("6e A")).toBeVisible();
    await expect(item.getByText(/Envoyé par Fatou Sow le \d{1,2} \S+ à \d{1,2} h \d{2}/)).toBeVisible();
    await item.getByRole("button", { name: "Justificatif de Mariama Sow" }).click();
    const photo = director.getByRole("dialog", { name: "Justificatif de Mariama Sow" });
    await expect(photo.getByRole("link", { name: "Ouvrir l'original" })).toBeVisible();
    await photo.getByRole("button", { name: "Fermer" }).first().click();
    await expect(photo).toHaveCount(0);
    await item.getByRole("button", { name: "Accepter" }).click();
    await expect(director.getByText("Justificatif accepté.")).toBeVisible();
    await expect(item).toHaveCount(0);

    await director.getByRole("link", { name: "Traités" }).click();
    const reviewed = director.getByRole("list", { name: "Justificatifs" }).getByRole("listitem").filter({ hasText: comment });
    await expect(reviewed.getByText("Acceptée", { exact: true })).toBeVisible();
    await expect(reviewed.getByRole("button", { name: "Refuser" })).toBeVisible();
    await directorContext.close();

    // Le parent voit la décision ; il ne peut plus retirer le justificatif.
    await parent.reload();
    const decided = parent.getByRole("list", { name: "Justificatifs" }).getByRole("listitem").filter({ hasText: comment });
    await expect(decided.getByText("Acceptée", { exact: true })).toBeVisible();
    await expect(decided.getByText(/^Acceptée par .+ le \d{1,2} \S+$/)).toBeVisible();
    await expect(decided.getByRole("button", { name: "Retirer" })).toHaveCount(0);
    await parentContext.close();
  });
});
