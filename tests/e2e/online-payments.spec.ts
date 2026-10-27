import { expect, test } from "@playwright/test";
import { DEMO, issueInvoicesFor, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Paiement en ligne", () => {
  test("le parent paie une mensualité en ligne (démonstration) : échec, nouvel essai, reçu", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(150_000);
    const name = `Mensualité test ${Date.now().toString(36)}`;
    page.on("dialog", (dialog) => void dialog.accept());
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Une mensualité de 15 000 FCFA en sixième, facturée à Mariama Sow pour un mois propre à ce test.
    await page.goto("/direction/finances/frais");
    await page.getByRole("button", { name: "Nouveau type de frais" }).click();
    const sheet = page.getByRole("dialog", { name: "Nouveau type de frais" });
    await sheet.getByLabel("Nature").selectOption({ label: "Mensualité" });
    await sheet.getByLabel("Intitulé").fill(name);
    await sheet.getByRole("button", { name: "Créer le frais" }).click();
    await expect(page.getByText("Type de frais créé.")).toBeVisible();
    await page.getByRole("textbox", { name: `${name} pour le niveau Sixième, en francs CFA` }).fill("15000");
    await page.getByRole("button", { name: "Enregistrer la grille" }).click();
    await expect(page.getByText("Grille des frais enregistrée.")).toBeVisible();
    const { liveInvoices } = await issueInvoicesFor(page, "Mariama Sow", testInfo.project.name === "mobile" ? 5 : 4);
    const number = (await liveInvoices.textContent())!.match(/F\d{4}-\d{5}/)![0];

    // Le parent ne garde que cette facture et la paie.
    const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const parent = await parentContext.newPage();
    await loginWithPhone(parent, DEMO.parentPhone);
    await expect(parent).toHaveURL(/\/parent$/);
    await parent.getByRole("link", { name: "Paiements" }).first().click();
    await expect(parent.getByRole("heading", { name: "Paiements", level: 1 })).toBeVisible();
    await expect(parent.getByText("Mode démonstration : le paiement est simulé, aucun argent n'est débité.")).toBeVisible();
    const mariama = parent.getByRole("region", { name: "Mariama Sow" });

    async function payOnly() {
      const items = mariama.getByRole("group", { name: "Factures à payer" }).getByRole("listitem");
      await expect(items.filter({ hasText: number })).toHaveCount(1);
      for (const item of await items.all()) {
        const box = item.getByRole("checkbox");
        const keep = (await item.textContent())!.includes(number);
        if (keep !== ((await box.getAttribute("aria-checked")) === "true")) await box.click();
      }
      // Montant de cette seule facture (d'autres frais laissés par un essai interrompu peuvent s'y ajouter).
      const amount = (await items.filter({ hasText: number }).textContent())!.match(/reste (.+?FCFA)/)![1]!;
      await mariama.getByRole("button", { name: `Payer ${amount} en ligne`, exact: true }).click();
      await expect(parent).toHaveURL(/\/parent\/paiements\/[0-9a-f-]{36}\/simulation$/);
      await expect(parent.getByText(amount, { exact: true })).toBeVisible();
    }

    // Premier essai : échec, rien n'est encaissé.
    await payOnly();
    await parent.getByRole("button", { name: "Simuler un échec" }).click();
    await expect(parent.getByText("Le paiement n'a pas abouti")).toBeVisible();
    await parent.getByRole("link", { name: "Réessayer" }).click();

    // Second essai : paiement confirmé, reçu disponible.
    await payOnly();
    await parent.getByRole("button", { name: "Payer", exact: true }).click();
    await expect(parent.getByText("Paiement confirmé")).toBeVisible();
    const receiptHref = await parent.getByRole("link", { name: "Télécharger le reçu (PDF)" }).getAttribute("href");
    const pdf = await parent.request.get(receiptHref!);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await parent.getByRole("link", { name: "Retour aux paiements" }).click();
    await expect(mariama.getByRole("listitem").filter({ hasText: number })).toHaveCount(0);
    await expect(
      mariama
        .getByRole("list", { name: "Reçus" })
        .getByText(/Paiement en ligne/)
        .first(),
    ).toBeVisible();
    await parentContext.close();

    // Côté direction : la facture est payée.
    await page.reload();
    await expect(liveInvoices.getByText("Payée", { exact: true })).toBeVisible();

    // Ménage : le frais, déjà facturé, est archivé (retiré de la grille).
    await page.goto("/direction/finances/frais");
    const remove = page.getByRole("button", { name: `Supprimer « ${name} »` });
    await expect(async () => {
      if ((await remove.count()) > 0) await remove.click({ timeout: 2000 });
      await expect(remove).toHaveCount(0, { timeout: 3000 });
    }).toPass();
  });
});
