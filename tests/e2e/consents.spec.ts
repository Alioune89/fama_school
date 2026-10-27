import { expect, test, type Locator } from "@playwright/test";
import { acceptWelcomeIfShown, adminClient, DEMO, loginWithPhone } from "./helpers";

/** Active un interrupteur (le premier clic peut précéder l'hydratation de la page). */
async function checkSwitch(target: Locator) {
  await expect(async () => {
    await target.click();
    await expect(target).toBeChecked({ timeout: 1500 });
  }).toPass();
}

/** Retire les consentements du parent de démonstration : sa prochaine entrée passe par la page de bienvenue. */
async function forgetConsents() {
  const admin = adminClient();
  const { data } = await admin.from("profiles").select("id").eq("phone", "+221770000001").maybeSingle();
  if (data) await admin.from("user_consents").delete().eq("user_id", data.id);
}

test.describe("Espace parents", () => {
  test("première connexion : langue, consentements, puis accueil enrichi et profil", async ({ page }) => {
    test.setTimeout(90_000);
    await forgetConsents();
    await loginWithPhone(page, DEMO.parentPhone, DEMO.otp, { acceptWelcome: false });

    // Bienvenue : le suivi scolaire est indispensable, photos et géolocalisation facultatives.
    await expect(page).toHaveURL(/\/bienvenue$/);
    await expect(page.getByRole("heading", { name: "Bienvenue, Fatou !", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuer" })).toBeDisabled();
    // La langue change aussitôt (le wolof, en bêta, retombe sur le français pour les textes non traduits).
    await expect(async () => {
      await page.getByRole("radio", { name: "Wolof (bêta)" }).click();
      await expect(page).toHaveURL(/\/wo\/bienvenue$/, { timeout: 2000 });
    }).toPass();
    await page.getByRole("radiogroup").getByRole("radio").first().click();
    await expect(page).not.toHaveURL(/\/wo\//);
    await checkSwitch(page.getByRole("switch", { name: "Suivi scolaire de mes enfants" }));
    await checkSwitch(page.getByRole("switch", { name: "Photos" }));
    await page.getByRole("button", { name: "Continuer" }).click();

    // Accueil : une carte par enfant, avec ses repères.
    await expect(page).toHaveURL(/\/parent$/);
    const mariama = page.getByRole("link", { name: /Mariama Sow/ });
    await expect(mariama.getByText("Dernière note")).toBeVisible();
    await expect(mariama.getByText("Prochaine compo")).toBeVisible();
    await expect(mariama.getByText("À payer")).toBeVisible();

    // Fiche enfant : paiements et reçus.
    await mariama.click();
    await expect(page.getByRole("heading", { name: "Paiements et reçus" })).toBeVisible();

    // Profil : les choix se modifient.
    await page.goto("/parent/profil");
    const location = page.getByRole("switch", { name: "Géolocalisation" });
    await expect(page.getByRole("switch", { name: "Photos" })).toBeChecked();
    await expect(location).not.toBeChecked();
    await checkSwitch(location);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Vos choix sont enregistrés.")).toBeVisible();
    await page.reload();
    await expect(location).toBeChecked();

    // Sans consentement, l'espace parent renvoie vers la bienvenue, même par un lien direct.
    await forgetConsents();
    await page.goto("/parent/paiements");
    await expect(page).toHaveURL(/\/bienvenue$/);
    await acceptWelcomeIfShown(page);
  });
});
