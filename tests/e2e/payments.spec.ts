import { expect, test } from "@playwright/test";
import { clickUntilVisible, DEMO, issueInvoicesFor, loginWithEmail } from "./helpers";

test.describe("Guichet", () => {
  test("encaissement partiel par Wave, reçu PDF vérifiable, demande d'annulation ; dépenses", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(120_000);
    const name = `Mensualité test ${Date.now().toString(36)}`;
    // Confirmations (suppressions) acceptées tout au long du test.
    page.on("dialog", (dialog) => void dialog.accept());
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Une mensualité de 25 000 FCFA en sixième, facturée pour le mois proposé.
    await page.goto("/direction/finances/frais");
    await page.getByRole("button", { name: "Nouveau type de frais" }).click();
    const sheet = page.getByRole("dialog", { name: "Nouveau type de frais" });
    await sheet.getByLabel("Nature").selectOption({ label: "Mensualité" });
    await sheet.getByLabel("Intitulé").fill(name);
    await sheet.getByRole("button", { name: "Créer le frais" }).click();
    await expect(page.getByText("Type de frais créé.")).toBeVisible();
    await page.getByRole("textbox", { name: `${name} pour le niveau Sixième, en francs CFA` }).fill("25000");
    await page.getByRole("button", { name: "Enregistrer la grille" }).click();
    await expect(page.getByText("Grille des frais enregistrée.")).toBeVisible();
    await issueInvoicesFor(page, "Mariama Sow", testInfo.project.name === "mobile" ? 3 : 2);

    // Guichet : Mariama Sow paie 10 000 FCFA par Wave.
    await page.goto("/direction/finances/encaissements/nouveau");
    await page.getByRole("searchbox", { name: "Rechercher un élève" }).fill("Mariama Sow");
    await expect(page).toHaveURL(/q=Mariama/);
    await page.getByRole("link", { name: /Mariama Sow/ }).click();
    await expect(page.getByRole("heading", { name: "Mariama Sow" })).toBeVisible();
    const amount = page.getByLabel("Montant reçu (FCFA)");
    await expect(amount).not.toHaveValue("");
    await amount.fill("10000");
    await page.getByRole("radio", { name: "Wave" }).click();
    await page.getByLabel("Référence de la transaction").fill("TX-E2E");
    await page.getByRole("button", { name: "Encaisser et éditer le reçu" }).click();
    await expect(page.getByRole("heading", { name: /^Reçu R\d{4}-\d{5}$/, level: 1 })).toBeVisible();
    await expect(page.getByText("Arrêté le présent reçu à la somme de dix mille francs CFA.")).toBeVisible();
    await expect(page.getByText("Wave · réf. TX-E2E")).toBeVisible();

    // Le reçu en PDF, et sa vérification publique.
    const receiptId = page.url().split("/").at(-1)!;
    const pdf = await page.request.get(`/api/recus/${receiptId}`);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    const code = (await page.locator(".rr-footer .rr-code").textContent())!.split("/").at(-1)!.trim();
    const visitor = await browser.newContext({
      ...testInfo.project.use,
      baseURL,
      extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}` },
    });
    const anonymous = await visitor.newPage();
    await anonymous.goto(`/verifier/${code}`);
    await expect(anonymous.getByRole("heading", { name: "Reçu authentique" })).toBeVisible();
    await expect(anonymous.getByText(/^10\s000\sFCFA$/)).toBeVisible();
    await visitor.close();

    // Demande d'annulation : le directeur qui la demande ne peut pas la valider lui-même.
    await clickUntilVisible(
      page.getByRole("button", { name: "Demander l'annulation" }),
      page.getByLabel("Motif de l'annulation"),
    );
    await page.getByLabel("Motif de l'annulation").fill("Test automatique");
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(page.getByText("Demande d'annulation envoyée au directeur.")).toBeVisible();
    await expect(page.getByText("Annulation demandée : Test automatique")).toBeVisible();
    await expect(page.getByRole("button", { name: "Valider l'annulation" })).toHaveCount(0);
    await page.goto("/direction/finances/encaissements");
    await expect(page.getByText(/demandes? d'annulation attend/)).toBeVisible();

    // Dépenses.
    const label = `Fournitures test ${Date.now().toString(36)}`;
    await page.goto("/direction/finances/depenses");
    await page.getByRole("button", { name: "Nouvelle dépense" }).click();
    const expense = page.getByRole("dialog", { name: "Nouvelle dépense" });
    await expense.getByLabel("Catégorie").selectOption({ label: "Fournitures" });
    await expense.getByLabel("Libellé").fill(label);
    await expense.getByLabel("Montant (FCFA)").fill("5000");
    await expense.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Dépense enregistrée.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Dépenses" }).getByText(label)).toBeVisible();
    await page.getByRole("button", { name: `Supprimer « ${label} »` }).click();
    await expect(page.getByText("Dépense supprimée.")).toBeVisible();

    // Ménage : le frais est archivé s'il a été facturé, supprimé sinon (élèves déjà facturés ce mois-ci).
    await page.goto("/direction/finances/frais");
    // Le bouton répond une fois la page interactive : on réessaie jusqu'au message.
    await expect(async () => {
      await page.getByRole("button", { name: `Supprimer « ${name} »` }).click();
      await expect(page.getByText(/est archivé|^Type de frais supprimé\.$/)).toBeVisible({ timeout: 2000 });
    }).toPass();
  });
});
