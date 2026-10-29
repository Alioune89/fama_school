import { expect, test } from "@playwright/test";
import { adminClient, DEMO, loginWithEmail } from "./helpers";

const SCHOOL_ID = "b0000000-0000-4000-8000-000000000001";

async function cleanUp() {
  const admin = adminClient();
  const { data } = await admin.from("exam_candidates").select("id").eq("school_id", SCHOOL_ID);
  for (const row of data ?? []) await admin.from("notifications").delete().eq("dedupe_key", `exam:${row.id}`);
  await admin.from("exam_candidates").delete().eq("school_id", SCHOOL_ID);
}

test.describe("Examens", () => {
  test.beforeEach(cleanUp);
  test.afterEach(cleanUp);

  test("la direction note les convocations du BFEM puis saisit les résultats", async ({ page }) => {
    test.setTimeout(120_000);
    await loginWithEmail(page, DEMO.director);
    await expect(page).toHaveURL(/\/direction$/);
    await page.goto("/direction/notes");
    await page.getByRole("link", { name: "Examens" }).click();
    await expect(page.getByRole("link", { name: "BFEM" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(/4 candidats au BFEM/)).toBeVisible();

    await page.getByLabel("Centre d'examen", { exact: true }).fill("CEM Liberté 6");
    await page.getByRole("button", { name: "Appliquer aux candidats sans centre" }).click();
    await expect(page.getByLabel("Centre d'examen de Kane Abdou")).toHaveValue("CEM Liberté 6");
    await page.getByLabel("Numéro de table de Kane Abdou").fill("3E-0412");
    await expect(page.getByText("4 candidats modifiés, non enregistré")).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("4 candidats enregistrés.")).toBeVisible();

    // Après la proclamation : admis avec mention ; la mention n'est ouverte qu'aux admis.
    const mention = page.getByLabel("Mention de Kane Abdou");
    await expect(mention).toBeDisabled();
    await page.getByLabel("Résultat de Kane Abdou").selectOption({ label: "Admis" });
    await mention.selectOption({ label: "Bien" });
    await page.getByLabel("Résultat de Fall Mariama").selectOption({ label: "Second tour" });
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("2 candidats enregistrés.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Numéro de table de Kane Abdou")).toHaveValue("3E-0412");
    await expect(page.getByLabel("Mention de Kane Abdou")).toHaveValue("bien");
    await expect(page.getByLabel("Résultat de Fall Mariama")).toHaveValue("second_round");
    await expect(page.getByRole("button", { name: "Imprimer" })).toBeVisible();
  });
});
