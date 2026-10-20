import { expect, test, type Page } from "@playwright/test";
import { DEMO, loginWithEmail } from "./helpers";

/** Texte visible (les pages précédentes restent en mémoire, masquées, et le tableau est caché sur mobile). */
const visibleText = (page: Page, text: string) => page.getByText(text).filter({ visible: true }).first();

/** Numéro unique par exécution (évite de réutiliser un parent existant entre desktop et mobile). */
function uniquePhone(prefix = "76") {
  const digits = String(Date.now()).slice(-7);
  return `${prefix} ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)}`;
}

test.describe("Lot 1 — élèves", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
  });

  test("la liste des élèves se cherche et se filtre par classe", async ({ page }) => {
    await page.goto("/direction/eleves");
    await expect(page.getByRole("heading", { name: "Élèves", level: 1 })).toBeVisible();

    await page.getByPlaceholder("Nom, prénom ou matricule…").fill("Sow Mariama");
    await expect(page).toHaveURL(/q=Sow/);
    await expect(visibleText(page, "Mariama Sow")).toBeVisible();
    await expect(visibleText(page, "Fatou Sow")).toBeVisible();

    await page.getByPlaceholder("Nom, prénom ou matricule…").fill("Sow");
    const classFilter = page.getByRole("combobox", { name: "Classe" });
    const ce2 = await classFilter.evaluate(
      (element) => [...(element as HTMLSelectElement).options].find((option) => option.label.startsWith("CE2 A"))?.value ?? "",
    );
    await classFilter.selectOption(ce2);
    await expect(page).toHaveURL(/classe=/);
    await expect(visibleText(page, "Modou Sow")).toBeVisible();
    await expect(page.getByText("Mariama Sow").filter({ visible: true })).toHaveCount(0);
  });

  test("inscrire un élève avec son parent ouvre sa fiche", async ({ page }) => {
    const firstName = `Test${Date.now().toString(36)}`;
    await page.goto("/direction/eleves");
    await page.getByRole("button", { name: "Inscrire un élève" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Nom", { exact: true }).fill("Ndiaye");
    await sheet.getByLabel("Prénom(s)").fill(firstName);
    await sheet.getByLabel("Sexe").selectOption("F");
    await sheet.getByLabel("Date de naissance").fill("2015-03-14");
    await sheet.getByLabel("Classe").selectOption({ index: 1 });
    await sheet.getByLabel("Nom complet").fill("Aïssatou Ndiaye");
    await sheet.getByLabel("Téléphone").fill(uniquePhone());
    await sheet.getByLabel("Lien").selectOption("mother");
    await sheet.getByRole("button", { name: "Inscrire", exact: true }).click();

    await expect(page).toHaveURL(/\/direction\/eleves\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: `${firstName} Ndiaye`, level: 1 })).toBeVisible();
    await expect(visibleText(page, "Aïssatou Ndiaye")).toBeVisible();
    await expect(visibleText(page, "Invité")).toBeVisible();
  });

  test("importer un fichier CSV : aperçu, lignes écartées, puis import", async ({ page }) => {
    const tag = Date.now().toString(36);
    const csv = [
      "Nom;Prénom;Sexe;Date de naissance;Classe;Nom du parent;Téléphone du parent;Lien",
      `Import${tag};Awa;F;14/03/2015;CM2 A;Moussa Diop;${uniquePhone("75")};Père`,
      `Import${tag};Lamine;G;02/09/2014;CM2 A;;;`,
      `Import${tag};Inconnu;M;01/01/2014;Classe fantôme;;;`,
    ].join("\r\n");

    await page.goto("/direction/eleves/importer");
    await expect(page.getByRole("heading", { name: "Importer une liste d'élèves", level: 1 })).toBeVisible();
    // Le titre arrive avec le HTML serveur : on redépose le fichier tant que la page n'est pas interactive.
    await expect(async () => {
      await page.locator("#student-import-file").setInputFiles({
        name: "eleves.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("﻿" + csv, "utf8"),
      });
      await expect(visibleText(page, "1 ligne avec une classe inconnue")).toBeVisible({ timeout: 2_000 });
    }).toPass();
    await page.getByRole("button", { name: "Importer 2 élèves" }).click();
    await expect(visibleText(page, "2 élèves importés")).toBeVisible();

    await page.getByRole("link", { name: "Voir les élèves" }).click();
    await page.getByPlaceholder("Nom, prénom ou matricule…").fill(`Import${tag}`);
    await expect(page.getByText("2 élèves").filter({ visible: true })).toBeVisible();
  });
});

/** PNG 1×1 (photo d'identité de test) et PDF minimal (extrait de naissance). */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

test.describe("Lot 1 — fiche élève : parents, photo et dossier", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
  });

  test("ajouter, modifier, désigner et retirer un parent ; photo et documents", async ({ page }) => {
    page.on("dialog", (dialog) => void dialog.accept());
    const firstName = `Dossier${Date.now().toString(36)}`;
    await page.goto("/direction/eleves");
    await page.getByRole("button", { name: "Inscrire un élève" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Nom", { exact: true }).fill("Cissé");
    await sheet.getByLabel("Prénom(s)").fill(firstName);
    await sheet.getByLabel("Sexe").selectOption("F");
    await sheet.getByLabel("Classe").selectOption({ index: 1 });
    await sheet.getByLabel("Nom complet").fill("Mamadou Cissé");
    await sheet.getByLabel("Téléphone").fill(uniquePhone("77"));
    await sheet.getByLabel("Lien").selectOption("father");
    await sheet.getByRole("button", { name: "Inscrire", exact: true }).click();
    await expect(page.getByRole("heading", { name: `${firstName} Cissé`, level: 1 })).toBeVisible();

    // Second parent, contact principal
    await page.getByRole("button", { name: "Ajouter un parent" }).click();
    const add = page.getByRole("dialog");
    await add.getByLabel("Nom complet").fill("Rokhaya Cissé");
    await add.getByLabel("Téléphone").fill(uniquePhone("70"));
    await add.getByLabel("Lien").selectOption("mother");
    await add.getByLabel("En faire le contact principal").check();
    await add.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(visibleText(page, "Parent ajouté.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Faire de Mamadou Cissé le contact principal" })).toBeVisible();

    await page.getByRole("button", { name: "Faire de Mamadou Cissé le contact principal" }).click();
    await expect(page.getByRole("button", { name: "Faire de Rokhaya Cissé le contact principal" })).toBeVisible();

    await page.getByRole("button", { name: "Modifier Rokhaya Cissé" }).click();
    const edit = page.getByRole("dialog");
    await edit.getByLabel("Profession").fill("Couturière");
    await edit.getByRole("button", { name: "Enregistrer" }).click();
    await expect(visibleText(page, "Mère · Couturière")).toBeVisible();

    await page.getByRole("button", { name: "Retirer Rokhaya Cissé" }).click();
    await expect(visibleText(page, "Parent retiré.")).toBeVisible();
    await expect(page.getByText("Rokhaya Cissé").filter({ visible: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retirer Mamadou Cissé" })).toHaveCount(0);

    // Photo d'identité
    await page.getByLabel("Ajouter une photo").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: PNG });
    await expect(visibleText(page, "Photo enregistrée.")).toBeVisible();
    await expect
      .poll(
        () =>
          page
            .locator("main section img")
            .first()
            .evaluate((img: HTMLImageElement) => img.naturalWidth),
        {
          message: "la photo est chargée depuis le stockage",
        },
      )
      .toBeGreaterThan(0);

    // Dossier : extrait de naissance en PDF
    await page.getByLabel("Ajouter un document").setInputFiles({ name: "extrait.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(visibleText(page, "Document ajouté.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Télécharger extrait.pdf" })).toBeVisible();
    await page.getByRole("button", { name: "Supprimer extrait.pdf" }).click();
    await expect(visibleText(page, "Aucun document pour l'instant.")).toBeVisible();
  });
});
