import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithEmail } from "./helpers";

const SCHOOL_ID = "b0000000-0000-4000-8000-000000000001";
// Image PNG 1×1 : suffit pour vérifier l'envoi, la réduction et l'affichage.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function cleanUp() {
  const admin = adminClient();
  const { data } = await admin.storage.from("school-sites").list(SCHOOL_ID);
  if (data?.length) await admin.storage.from("school-sites").remove(data.map((file) => `${SCHOOL_ID}/${file.name}`));
  await admin.from("school_sites").delete().eq("school_id", SCHOOL_ID);
}

test.describe("Site vitrine", () => {
  test.beforeEach(cleanUp);
  test.afterEach(cleanUp);

  test("la direction rédige le site, le prévisualise puis le publie ; un visiteur le découvre", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(150_000);
    const tagline = `Apprendre et réussir à Dakar (test ${Date.now().toString(36)})`;
    const visitorContext = await browser.newContext({ ...testInfo.project.use, baseURL, storageState: undefined });
    const visitor = await visitorContext.newPage();

    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
    await page.goto("/direction/site");
    await expect(page.getByRole("heading", { name: "Brouillon, pas encore en ligne" })).toBeVisible();
    await page.getByLabel("Accroche").fill(tagline);
    await page.getByLabel("Présentation de l'école").fill("Une école familiale au cœur de Sacré-Cœur.");
    await page.getByRole("radio", { name: "Vert" }).check({ force: true });
    await page.getByRole("button", { name: "Ajouter un chiffre" }).click();
    await page.getByLabel("Chiffre", { exact: true }).fill("98 %");
    await page.getByLabel("Libellé du chiffre").fill("de réussite au BFEM");
    await page.getByRole("button", { name: "Ajouter un frais" }).click();
    await page.getByLabel("Libellé du frais").fill("Mensualité collège");
    await page.getByLabel("Montant en FCFA").fill("25000");
    await page.getByRole("button", { name: "Ajouter une question" }).click();
    await page.getByLabel("Question", { exact: true }).fill("Y a-t-il une cantine ?");
    await page.getByLabel("Réponse").fill("Oui, tous les midis.");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Site enregistré.")).toBeVisible();

    await page.getByLabel("Ajouter une photo").setInputFiles({ name: "ecole.png", mimeType: "image/png", buffer: PIXEL });
    await expect(page.getByText("Photo ajoutée.")).toBeVisible();
    await expect(page.getByRole("img", { name: "Photo principale" })).toBeVisible();

    // Brouillon : introuvable pour un visiteur, visible en aperçu pour la direction.
    await visitor.goto("/ecoles/les-baobabs");
    await expect(visitor.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
    await page.goto("/ecoles/les-baobabs?apercu=1");
    await expect(page.getByText(/Aperçu : ce site n'est pas encore publié/)).toBeVisible();
    await expect(page.getByText(tagline)).toBeVisible();

    await page.goto("/direction/site");
    await page.getByRole("button", { name: "Publier le site" }).click();
    await expect(page.getByRole("heading", { name: "Site en ligne" })).toBeVisible();

    await visitor.goto("/ecoles/les-baobabs");
    await expect(visitor.getByRole("heading", { level: 1, name: "Groupe Scolaire Les Baobabs" })).toBeVisible();
    await expect(visitor.getByText(tagline)).toBeVisible();
    await expect(visitor.getByText("de réussite au BFEM")).toBeVisible();
    await expect(visitor.getByText("25 000 FCFA")).toBeVisible();
    await expect(visitor.getByRole("heading", { name: "Notre cursus" })).toBeVisible();
    await visitor.getByText("Y a-t-il une cantine ?").click();
    await expect(visitor.getByText("Oui, tous les midis.")).toBeVisible();
    await expect(visitor.getByRole("link", { name: "+221 33 800 00 01" })).toBeVisible();
    await expect(visitor).toHaveTitle(/Groupe Scolaire Les Baobabs · Dakar/);

    // Retiré du web : de nouveau introuvable.
    await page.getByRole("button", { name: "Retirer du web" }).click();
    await expect(page.getByRole("heading", { name: "Brouillon, pas encore en ligne" })).toBeVisible();
    await visitor.goto("/ecoles/les-baobabs");
    await expect(visitor.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
    await visitorContext.close();
  });
});
