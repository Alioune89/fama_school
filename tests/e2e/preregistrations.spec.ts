import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithEmail } from "./helpers";

const SCHOOL_ID = "b0000000-0000-4000-8000-000000000001";
// Image PNG 1×1 : suffit pour vérifier la réduction, l'envoi signé et la lecture par la direction.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function cleanUp(phone: string) {
  const admin = adminClient();
  const { data: requests } = await admin
    .from("preregistrations")
    .select("id, student_id, attachments")
    .eq("school_id", SCHOOL_ID)
    .eq("guardian_phone", phone);
  for (const request of requests ?? []) {
    const paths = (request.attachments as { path: string }[]).map((file) => file.path);
    if (paths.length) await admin.storage.from("preregistrations").remove(paths);
    await admin.from("notifications").delete().eq("dedupe_key", `preregistration:${request.id}`);
    await admin.from("preregistrations").delete().eq("id", request.id);
    if (request.student_id) await admin.from("students").delete().eq("id", request.student_id);
  }
  await admin.from("guardians").delete().eq("school_id", SCHOOL_ID).eq("phone", phone);
  await admin.from("school_sites").delete().eq("school_id", SCHOOL_ID);
}

test.describe("Pré-inscription", () => {
  const local = `77${Date.now().toString().slice(-7)}`;
  const phone = `+221${local}`;
  test.afterEach(() => cleanUp(phone));

  test("un parent pré-inscrit son enfant depuis le site ; la direction la retient puis l'inscrit en un clic", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(150_000);
    const firstName = `Khady${Date.now().toString(36).slice(-4)}`;
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
    await page.goto("/direction/site");
    await page.getByRole("button", { name: "Publier le site" }).click();
    await expect(page.getByRole("heading", { name: "Site en ligne" })).toBeVisible();

    // Le parent, depuis le site de l'école.
    const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL, storageState: undefined });
    const parent = await parentContext.newPage();
    await parent.goto("/ecoles/les-baobabs");
    await parent.getByRole("link", { name: "Pré-inscrire mon enfant" }).first().click();
    await expect(parent.getByRole("heading", { level: 1, name: "Pré-inscription" })).toBeVisible();
    await parent.getByLabel("Prénom", { exact: true }).fill(firstName);
    await parent.getByLabel("Nom", { exact: true }).fill("Ndiaye");
    await parent.getByLabel("Sexe").selectOption({ label: "Fille" });
    await parent.getByLabel("Date de naissance").fill("2015-03-12");
    await parent.getByLabel("Classe demandée").selectOption({ label: "Sixième" });
    await parent.getByLabel("Prénom et nom").fill("Ousmane Faye");
    await parent.getByLabel("Lien avec l'enfant").selectOption({ label: "Père" });
    await parent.getByLabel("Téléphone").fill(local);
    await parent.getByLabel("Ajouter un document").setInputFiles({ name: "extrait.png", mimeType: "image/png", buffer: PIXEL });
    await expect(parent.getByText("extrait.png")).toBeVisible();
    await parent.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(parent.getByRole("heading", { name: "Demande envoyée" })).toBeVisible();
    await expect(parent.getByText(/^P\d{4}-\d{4,}$/)).toBeVisible();
    await parentContext.close();

    // La direction la retrouve depuis la liste des élèves.
    await page.goto("/direction/eleves");
    await page.getByRole("link", { name: /Pré-inscriptions/ }).click();
    await page.getByRole("link", { name: new RegExp(`${firstName} Ndiaye`) }).click();
    await expect(page.getByRole("heading", { level: 1, name: `${firstName} Ndiaye` })).toBeVisible();
    await expect(page.getByText("Sixième", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "extrait.png" })).toHaveAttribute("href", /\/storage\/v1\/object\/sign\//);

    await page.getByRole("button", { name: "Retenir" }).click();
    const decision = page.getByRole("dialog", { name: "Retenir la demande" });
    await decision.getByLabel("Mot pour le parent (facultatif)").fill("Présentez-vous jeudi à 9 h.");
    await decision.getByRole("button", { name: "Retenir" }).click();
    await expect(page.getByText(/^Demande retenue\./)).toBeVisible();
    await expect(page.getByText("Présentez-vous jeudi à 9 h.")).toBeVisible();

    await page.getByRole("button", { name: "Inscrire" }).click();
    const enroll = page.getByRole("dialog", { name: `Inscrire ${firstName} Ndiaye` });
    await expect(enroll.getByLabel("Classe")).toHaveValue(/[0-9a-f-]{36}/);
    await enroll.getByRole("button", { name: "Inscrire" }).click();
    await expect(page).toHaveURL(/\/direction\/eleves\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: `${firstName} Ndiaye` })).toBeVisible();
    await expect(page.locator("#contenu").getByText("Ousmane Faye", { exact: true })).toBeVisible();

    // Fin : le site retourne en brouillon.
    await page.goto("/direction/site");
    await page.getByRole("button", { name: "Retirer du web" }).click();
    await expect(page.getByRole("heading", { name: "Brouillon, pas encore en ligne" })).toBeVisible();
  });
});
