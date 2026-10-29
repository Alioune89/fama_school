import { expect, test } from "@playwright/test";
import { DEMO, loginWithPhone } from "./helpers";

// Sans clés VAPID (simulation, CI) : le choix est gardé et le parent voit « bientôt disponible ». L'abonnement réel
// ne se teste pas ici : le Chromium de Playwright n'a pas accès au service push de Google (« permission denied »).
const configured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

test.describe("Notifications push", () => {
  test.skip(configured, "Abonnement push impossible dans le Chromium de test");

  test("sans clés, le parent garde son choix et voit que le service arrive bientôt", async ({ page }) => {
    await loginWithPhone(page, DEMO.parentPhone);
    await expect(page).toHaveURL(/\/parent$/);
    await page.goto("/parent/profil");
    const push = page.getByRole("switch", { name: "Notifications sur le téléphone" });
    if ((await push.getAttribute("aria-checked")) !== "true") await push.click();
    await expect(page.getByText(/Bientôt disponible : l'école n'a pas encore activé ce service/)).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer mes notifications" }).click();
    await expect(page.getByText("Vos choix de notification sont enregistrés.")).toBeVisible();
  });
});
