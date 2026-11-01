import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Fiche école (équipe Fama School)", () => {
  test("la liste montre l'activité et ouvre la fiche avec contact, mise en route et équipe", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithEmail(page, DEMO.admin);
    await expect(page).toHaveURL(/\/plateforme$/);

    const table = page.getByRole("table");
    await expect(table.getByRole("columnheader", { name: "Activité" })).toBeVisible();
    const baobabs = table.getByRole("row").filter({ hasText: "Groupe Scolaire Les Baobabs" });
    await expect(baobabs.getByText(/^(Mise en route|Régulière|Ralentit|À l'arrêt)$/)).toBeVisible();

    await baobabs.getByRole("link", { name: "Groupe Scolaire Les Baobabs" }).click();
    await expect(page).toHaveURL(/\/plateforme\/ecoles\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Groupe Scolaire Les Baobabs" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Activité des 7 derniers jours" })).toBeVisible();
    for (const label of ["Élèves actifs", "Appels faits", "Notes saisies", "Encaissements", "Parents connectés"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    const contact = page.getByRole("region", { name: "Contact" });
    await expect(contact.getByText("Moussa Ndiaye")).toBeVisible();

    const setup = page.getByRole("region", { name: "Mise en route" });
    await expect(setup.getByText(/^\d étapes sur 6$/)).toBeVisible();
    await expect(setup.getByText("Identité de l'école")).toBeVisible();

    const team = page.getByRole("region", { name: "Équipe" });
    await expect(team.getByText("Moussa Ndiaye")).toBeVisible();
    await expect(team.getByText("Cheikh Ba")).toBeVisible();

    await page.getByRole("link", { name: "Toutes les écoles" }).click();
    await expect(page).toHaveURL(/\/plateforme$/);
  });

  test("une fiche inconnue affiche la page introuvable", async ({ page }) => {
    await loginWithEmail(page, DEMO.admin);
    await expect(page).toHaveURL(/\/plateforme$/);
    await page.goto("/plateforme/ecoles/00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  });
});

test.describe("Abonnements et suspension (équipe Fama School)", () => {
  test("date de fin, paiement qui prolonge l'abonnement, puis école suspendue sans accès", async ({ browser }, testInfo) => {
    test.setTimeout(120_000);
    const admin = adminClient();
    const { data: school } = await admin.from("schools").select("id, subscription_ends_on").eq("slug", "al-amine").single();
    const baseURL = testInfo.project.use.baseURL;
    const context = await browser.newContext({ ...testInfo.project.use, baseURL });
    const page = await context.newPage();
    try {
      await loginWithEmail(page, DEMO.admin);
      await expect(page).toHaveURL(/\/plateforme$/);
      await page.goto(`/plateforme/ecoles/${school!.id}`);
      const section = page.getByRole("region", { name: "Abonnement" });

      // Fin du pilote dans 10 jours : à relancer.
      const inTenDays = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
      await section.getByLabel("Fin de la période couverte (pilote ou abonnement)").fill(inTenDays);
      await section.getByRole("button", { name: "Enregistrer la date" }).click();
      await expect(page.getByText("Date de fin enregistrée.")).toBeVisible();
      await expect(section.getByText("Se termine dans 10 jours")).toBeVisible();

      // Paiement reçu par Wave : l'abonnement est prolongé jusqu'à la période couverte.
      const covers = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
      await section.getByRole("button", { name: "Enregistrer un paiement" }).click();
      const form = section.getByRole("form", { name: "Enregistrer un paiement" });
      await form.getByLabel("Montant (FCFA)").fill("60000");
      await form.getByLabel("Couvre jusqu'au").fill(covers);
      await form.getByLabel("Référence (facultatif)").fill("WAVE-TEST");
      await form.getByRole("button", { name: "Enregistrer le paiement" }).click();
      await expect(page.getByText("Paiement enregistré : l'abonnement est prolongé.")).toBeVisible();
      await expect(section.getByText(/^À jour · 60 jours$/)).toBeVisible();
      await expect(section.getByText(/60\D000\D+FCFA/)).toBeVisible();
      await expect(section.getByText(/Wave · WAVE-TEST/)).toBeVisible();

      // La liste des écoles montre l'abonnement.
      await page.goto("/plateforme");
      const row = page.getByRole("row").filter({ hasText: "Institut Franco-Arabe Al Amine" });
      await expect(row.getByText("À jour · 60 jours")).toBeVisible();

      // École suspendue : sa direction n'a plus accès, mais peut écrire à Fama School.
      await admin.from("schools").update({ status: "suspended" }).eq("id", school!.id);
      const directorContext = await browser.newContext({ ...testInfo.project.use, baseURL });
      const director = await directorContext.newPage();
      await loginWithPhone(director, DEMO.alAmineDirectorPhone);
      await expect(director.getByRole("heading", { name: "Accès suspendu" })).toBeVisible();
      await expect(director.getByRole("link", { name: "Contacter Fama School" })).toHaveAttribute("href", /wa\.me/);
      await admin.from("schools").update({ status: "active" }).eq("id", school!.id);
      await director.reload();
      await expect(director.getByRole("heading", { name: "Accès suspendu" })).toHaveCount(0);
      await directorContext.close();
    } finally {
      await admin.from("subscription_payments").delete().eq("school_id", school!.id);
      await admin
        .from("schools")
        .update({ status: "active", subscription_ends_on: school!.subscription_ends_on })
        .eq("id", school!.id);
      await context.close();
    }
  });
});
