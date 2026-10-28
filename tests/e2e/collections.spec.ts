import { expect, test } from "@playwright/test";
import { adminClient, DEMO, issueInvoicesFor, loginWithEmail } from "./helpers";

test.describe("Suivi des encaissements", () => {
  test("vue d'ensemble, impayé relancé par WhatsApp, réglage des bulletins", async ({ page, context }, testInfo) => {
    test.setTimeout(120_000);
    const name = `Mensualité test ${Date.now().toString(36)}`;
    page.on("dialog", (dialog) => void dialog.accept());
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Une mensualité facturée à Mariama Sow, dont l'échéance est passée de dix jours.
    await page.goto("/direction/finances/frais");
    await page.getByRole("button", { name: "Nouveau type de frais" }).click();
    const sheet = page.getByRole("dialog", { name: "Nouveau type de frais" });
    await sheet.getByLabel("Nature").selectOption({ label: "Mensualité" });
    await sheet.getByLabel("Intitulé").fill(name);
    await sheet.getByRole("button", { name: "Créer le frais" }).click();
    await expect(page.getByText("Type de frais créé.")).toBeVisible();
    await page.getByRole("textbox", { name: `${name} pour le niveau Sixième, en francs CFA` }).fill("9000");
    await page.getByRole("button", { name: "Enregistrer la grille" }).click();
    await expect(page.getByText("Grille des frais enregistrée.")).toBeVisible();
    const { liveInvoices } = await issueInvoicesFor(page, "Mariama Sow", testInfo.project.name === "mobile" ? 7 : 6);
    const invoiceId = (await liveInvoices.getAttribute("href"))!.split("/").at(-1)!;
    const admin = adminClient();
    const { data: invoice } = await admin.from("invoices").select("due_on").eq("id", invoiceId).single();
    const late = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    await admin.from("invoices").update({ due_on: late }).eq("id", invoiceId);

    try {
      // Vue d'ensemble : chiffres de l'année, alerte des impayés, détail par mois.
      await page.goto("/direction/finances");
      await expect(page.getByRole("heading", { name: "Finances", level: 1 })).toBeVisible();
      await expect(page.getByText("Facturé cette année")).toBeVisible();
      await expect(page.getByRole("button", { name: /^[a-zéû]+ \d{4} : facturé / }).first()).toBeAttached();
      await page.getByText("Voir les chiffres en tableau").click();
      await expect(page.getByRole("table")).toBeVisible();
      await page.getByRole("link", { name: /en retard de paiement/ }).click();

      // Impayés : Mariama Sow, relancée par WhatsApp (message prérempli au numéro de sa mère).
      await expect(page).toHaveURL(/\/direction\/finances\/impayes$/);
      await expect(page.getByRole("heading", { name: "Impayés", level: 1 })).toBeVisible();
      const family = page
        .getByRole("list", { name: "Familles en retard de paiement" })
        .getByRole("listitem")
        .filter({ hasText: "Mariama Sow" });
      await expect(family.getByText(/jours? de retard/)).toBeVisible();
      const whatsapp = family.getByRole("link", { name: "Relancer la famille de Mariama Sow par WhatsApp" });
      await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/221770000001\?text=Bonjour%20Fatou%20Sow/);
      // Le lien ouvre WhatsApp dans un nouvel onglet : on n'attend que la relance notée.
      await context.route("https://wa.me/**", (route) => route.fulfill({ body: "WhatsApp" }));
      const popup = context.waitForEvent("page");
      await whatsapp.click();
      await (await popup).close();
      await expect(family.getByText(/^Dernière relance : WhatsApp, le /)).toBeVisible();

      // Réglage des bulletins : activé puis désactivé.
      const block = page.getByRole("switch", { name: /Bloquer le téléchargement des bulletins/ });
      await expect(block).not.toBeChecked();
      await block.click();
      await expect(page.getByText("Téléchargement des bulletins bloqué en cas d'impayé.")).toBeVisible();
      await page.reload();
      await expect(block).toBeChecked();
      await block.click();
      await expect(page.getByText("Les bulletins sont de nouveau téléchargeables par tous les parents.")).toBeVisible();
    } finally {
      // Ménage : échéance rétablie, frais archivé.
      await admin.from("invoices").update({ due_on: invoice!.due_on }).eq("id", invoiceId);
      await admin
        .from("schools")
        .select("id, settings")
        .then(async ({ data }) => {
          for (const school of data ?? []) {
            const settings = (school.settings ?? {}) as Record<string, unknown>;
            if (settings.blockReportCardsWhenOverdue) {
              await admin
                .from("schools")
                .update({ settings: { ...settings, blockReportCardsWhenOverdue: false } })
                .eq("id", school.id);
            }
          }
        });
      await page.goto("/direction/finances/frais");
      const remove = page.getByRole("button", { name: `Supprimer « ${name} »` });
      // La page s'affiche d'abord en squelette : attendre le bouton avant de le compter.
      await expect(remove).toBeVisible();
      await expect(async () => {
        if ((await remove.count()) > 0) await remove.click({ timeout: 2000 });
        await expect(remove).toHaveCount(0, { timeout: 3000 });
      }).toPass();
    }
  });
});
