import { expect, test } from "@playwright/test";
import { clickUntilVisible, DEMO, issueInvoicesFor, loginWithEmail } from "./helpers";

test.describe("Factures", () => {
  test("la direction émet les mensualités sans doublon, consulte une facture et l'annule", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const name = `Mensualité test ${Date.now().toString(36)}`;
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Une mensualité de 20 000 FCFA en sixième.
    await page.goto("/direction/finances/frais");
    await page.getByRole("button", { name: "Nouveau type de frais" }).click();
    const sheet = page.getByRole("dialog", { name: "Nouveau type de frais" });
    await sheet.getByLabel("Nature").selectOption({ label: "Mensualité" });
    await sheet.getByLabel("Intitulé").fill(name);
    await sheet.getByRole("button", { name: "Créer le frais" }).click();
    await expect(page.getByText("Type de frais créé.")).toBeVisible();
    await page.getByRole("textbox", { name: `${name} pour le niveau Sixième, en francs CFA` }).fill("20000");
    await page.getByRole("button", { name: "Enregistrer la grille" }).click();
    await expect(page.getByText("Grille des frais enregistrée.")).toBeVisible();

    // Émission des mensualités d'un mois propre à ce test et à ce format (voir issueInvoicesFor) : la facture
    // de Mariama Sow ; une seconde émission du même mois ne crée aucun doublon.
    const monthIndex = testInfo.project.name === "mobile" ? 1 : 0;
    const { liveInvoices: invoice } = await issueInvoicesFor(page, "Mariama Sow", monthIndex);
    const dialog = page.getByRole("dialog", { name: "Émettre des factures" });
    await clickUntilVisible(page.getByRole("button", { name: "Émettre des factures" }), dialog);
    await dialog.getByLabel("Factures à émettre").selectOption({ index: monthIndex });
    await dialog.getByRole("button", { name: "Émettre", exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(invoice).toHaveCount(1);
    await expect(invoice.getByText(/^(À payer|En retard)$/)).toBeVisible();
    await invoice.click();
    await expect(page.getByRole("heading", { name: /^Facture F\d{4}-\d{5}$/, level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: name })
        .getByText(/^20\s000\sFCFA$/)
        .first(),
    ).toBeVisible();

    // Annulation avec motif.
    await clickUntilVisible(page.getByRole("button", { name: "Annuler la facture" }), page.getByLabel("Motif de l'annulation"));
    await page.getByLabel("Motif de l'annulation").fill("Test automatique");
    await page.getByRole("button", { name: "Confirmer l'annulation" }).click();
    await expect(page.getByText("Facture annulée. Elle pourra être réémise.")).toBeVisible();
    await expect(page.getByText("Annulée : Test automatique")).toBeVisible();

    // Sur la fiche de l'élève.
    await page.getByRole("link", { name: "Mariama Sow" }).click();
    await expect(page.getByRole("region", { name: "Factures" }).getByText("Annulée").first()).toBeVisible();

    // Ménage : le frais, déjà facturé, est archivé.
    await page.goto("/direction/finances/frais");
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: `Supprimer « ${name} »` }).click();
    await expect(page.getByText(/est archivé/)).toBeVisible();
    await expect(page.getByRole("button", { name: `Supprimer « ${name} »` })).toHaveCount(0);
  });
});
