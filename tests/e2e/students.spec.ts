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
    await page.locator("#student-import-file").setInputFiles({
      name: "eleves.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("﻿" + csv, "utf8"),
    });

    await expect(visibleText(page, "1 ligne avec une classe inconnue")).toBeVisible();
    await page.getByRole("button", { name: "Importer 2 élèves" }).click();
    await expect(visibleText(page, "2 élèves importés")).toBeVisible();

    await page.getByRole("link", { name: "Voir les élèves" }).click();
    await page.getByPlaceholder("Nom, prénom ou matricule…").fill(`Import${tag}`);
    await expect(page.getByText("2 élèves").filter({ visible: true })).toBeVisible();
  });
});
