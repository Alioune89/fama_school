import { expect, test } from "@playwright/test";
import { adminClient, clickUntilVisible, DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Tableau de bord de la direction", () => {
  test("chaque indicateur ouvre son détail ; les parents se filtrent et s'invitent", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);

    // Le logo ramène à la page d'accueil du site, même connecté.
    await page.getByRole("link", { name: "Fama School" }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/:\d+\/$/);
    await page.goto("/direction");

    await page.getByRole("link", { name: /Élèves inscrits/ }).click();
    await expect(page).toHaveURL(/\/direction\/eleves$/);
    await page.goto("/direction");
    await page
      .getByRole("link", { name: /Enseignants/ })
      .filter({ hasText: /^\d/ })
      .click();
    await expect(page).toHaveURL(/\/direction\/professeurs$/);
    await page.goto("/direction");
    await page.getByRole("link", { name: /^\d+ Classes$/ }).click();
    await expect(page).toHaveURL(/\/direction\/classes$/);
    await page.goto("/direction");
    await page.getByRole("link", { name: /Parents connectés sur/ }).click();

    await expect(page).toHaveURL(/\/direction\/parents$/);
    await expect(page.getByRole("heading", { level: 1, name: "Parents" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Part des parents connectés" })).toBeVisible();
    await page.getByLabel("Connexion").selectOption({ label: "Pas encore connecté" });
    await expect(page).toHaveURL(/statut=non-connectes/);
    const invite = page.getByRole("link", { name: "Inviter par WhatsApp" }).first();
    await expect(invite).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=.*Fama%20School/);
    await expect(page.locator("li").getByText("Connecté", { exact: true })).toHaveCount(0);
  });

  test("le professeur ouvre ses classes, l'appel et ses messages depuis ses indicateurs", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithPhone(page, DEMO.teacherPhone);
    await page.getByRole("button", { name: /Groupe Scolaire Les Baobabs/ }).click();
    await expect(page).toHaveURL(/\/professeur$/);
    await page
      .getByRole("link", { name: /Mes classes/ })
      .filter({ hasText: /^\d/ })
      .click();
    await expect(page).toHaveURL(/\/professeur\/classes$/);
    const sixth = page.getByRole("region", { name: /^6e A/ }).filter({ visible: true });
    await expect(sixth.getByRole("link", { name: "Faire l'appel" })).toBeVisible();
    await sixth.getByText(/^Les \d+ élèves/).click();
    await expect(sixth.getByText("Sow Mariama")).toBeVisible();

    await page.goto("/professeur");
    await page.getByRole("link", { name: /Appels du matin faits/ }).click();
    await expect(page).toHaveURL(/\/professeur\/appel$/);
    await page.goto("/professeur");
    await page.getByRole("link", { name: /Messages non lus/ }).click();
    await expect(page).toHaveURL(/\/professeur\/messages$/);
  });

  test("« À faire aujourd'hui » mène à la tâche ; le menu suit le rôle", async ({ page }) => {
    test.setTimeout(90_000);
    const admin = adminClient();
    const { data: school } = await admin.from("schools").select("id").eq("slug", "les-baobabs").single();
    const reference = `P2026-${String(Date.now()).slice(-6)}`;
    const { data: request } = await admin
      .from("preregistrations")
      .insert({
        school_id: school!.id,
        reference,
        child_first_name: "Tâche",
        child_last_name: "Dujour",
        child_sex: "F",
        guardian_name: "Parent Dujour",
        guardian_phone: "+221770009999",
      })
      .select("id")
      .single();
    try {
      await loginWithEmail(page, DEMO.director);
      await expect(page).toHaveURL(/\/direction$/);
      const today = page.getByRole("region", { name: "À faire aujourd'hui" });
      await today.getByRole("link", { name: /pré-inscriptions? à traiter/ }).click();
      await expect(page).toHaveURL(/\/direction\/eleves\/preinscriptions$/);
      // Le directeur voit toutes les rubriques, dont les finances (menu latéral ou onglet mobile).
      await page.goto("/direction");
      await expect(page.getByText("Finances", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    } finally {
      await admin.from("preregistrations").delete().eq("id", request!.id);
    }
  });

  test("le censeur : pédagogie au menu, pas de finances", async ({ page }) => {
    test.setTimeout(90_000);
    await loginWithPhone(page, DEMO.censorPhone);
    await expect(page).toHaveURL(/\/direction$/);
    await expect(page.getByRole("region", { name: "À faire aujourd'hui" })).toBeVisible();
    await page.goto("/direction/notes");
    const mobile = page.viewportSize()!.width < 1024;
    const nav = mobile
      ? page.getByRole("dialog").getByRole("navigation")
      : page.getByRole("navigation", { name: "Menu" }).filter({ visible: true }).first();
    // Sur téléphone, le menu complet s'ouvre par « Plus » (bouton actif une fois la page interactive et la session lue).
    if (mobile)
      await clickUntilVisible(page.getByRole("button", { name: "Plus" }), nav.getByRole("link", { name: "Notes et bulletins" }));
    await expect(nav.getByRole("link", { name: "Notes et bulletins" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Programme" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Finances" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Personnel" })).toHaveCount(0);
  });

  for (const { role, phone, sees, hidden, blocked } of [
    {
      role: "la comptable",
      phone: DEMO.accountantPhone,
      sees: ["Parents"],
      hidden: ["Présences", "Classes", "Messages"],
      blocked: "/direction/notes",
    },
    {
      role: "la secrétaire",
      phone: DEMO.secretaryPhone,
      sees: ["Personnel", "Parents"],
      hidden: ["Présences", "Programme"],
      blocked: "/direction/presences",
    },
    {
      role: "le surveillant",
      phone: DEMO.supervisorPhone,
      sees: ["Présences", "Classes"],
      hidden: ["Personnel", "Programme"],
      blocked: "/direction/finances",
    },
  ]) {
    test(`${role} voit le menu de son métier`, async ({ page }) => {
      test.setTimeout(90_000);
      await loginWithPhone(page, phone);
      await expect(page).toHaveURL(/\/direction$/);
      await expect(page.getByRole("region", { name: "À faire aujourd'hui" })).toBeVisible();
      const mobile = page.viewportSize()!.width < 1024;
      const nav = mobile
        ? page.getByRole("dialog").getByRole("navigation")
        : page.getByRole("navigation", { name: "Menu" }).filter({ visible: true }).first();
      if (mobile) await clickUntilVisible(page.getByRole("button", { name: "Plus" }), nav.getByRole("link", { name: sees[0] }));
      for (const label of sees) await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
      for (const label of hidden) await expect(nav.getByRole("link", { name: label, exact: true })).toHaveCount(0);
      // Les finances : la comptable seulement (parmi ces trois rôles).
      await expect(nav.getByRole("button", { name: "Finances" })).toHaveCount(role === "la comptable" ? 1 : 0);

      // Une rubrique hors de son métier reste fermée, même en tapant son adresse.
      await page.goto(blocked);
      await expect(page.getByText("Rubrique réservée")).toBeVisible();
      await expect(page.getByRole("link", { name: "Revenir au tableau de bord" })).toBeVisible();
    });
  }
});
