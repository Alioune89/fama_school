import { expect, test } from "@playwright/test";
import { DEMO, loginWithEmail, loginWithPhone } from "./helpers";

test.describe("Pointage des arrivées", () => {
  test("la direction imprime les cartes, pointe l'arrivée et la sortie d'une élève ; le parent voit les heures", async ({
    browser,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;

    const directorContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const director = await directorContext.newPage();
    await loginWithEmail(director, DEMO.director);
    await expect(director).toHaveURL(/\/direction$/);

    // Cartes de la 6e A : une carte par élève, avec son QR code.
    await director.goto("/direction/presences");
    await director.getByRole("link", { name: "Cartes d'élève" }).filter({ visible: true }).click();
    await expect(director.getByRole("heading", { name: "Cartes d'élève", level: 1 })).toBeVisible();
    await director.getByRole("combobox", { name: "Classe" }).filter({ visible: true }).selectOption({ label: "6e A" });
    await expect(director).toHaveURL(/classe=/);
    const card = director.getByRole("list", { name: "Cartes d'élève" }).getByRole("listitem", { name: "Mariama Sow" });
    await expect(card.getByRole("img", { name: "QR code de pointage de Mariama Sow" })).toBeVisible();
    await expect(card.getByText("Classe : 6e A")).toBeVisible();
    await expect(director.getByRole("button", { name: "Imprimer" })).toBeVisible();

    // Pointage : carte oubliée, l'élève est cherchée par son nom.
    await director.goto("/direction/presences/pointage");
    await expect(director.getByRole("heading", { name: "Pointage des arrivées et des sorties", level: 1 })).toBeVisible();
    await expect(director.getByRole("button", { name: "Démarrer le scan" })).toBeVisible();
    await director.getByLabel("Carte oubliée ? Cherchez l'élève").fill("mariama");
    const match = director.getByRole("list", { name: "Élèves trouvés" }).getByRole("listitem").filter({ hasText: "Mariama Sow" });
    const checkIn = match.getByRole("button", { name: "Pointer l'arrivée de Mariama Sow" });
    if (await checkIn.isVisible()) {
      await checkIn.click();
      await expect(director.getByText(/^Mariama Sow · arrivé·e à \d{1,2} h \d{2}$/)).toBeVisible();
    }
    await expect(director.getByRole("list", { name: "Derniers passages" }).getByText("Mariama Sow")).toBeVisible();

    // Sortie : même recherche, mode « Sorties ».
    await director.getByRole("radio", { name: "Sorties" }).click();
    await director.getByLabel("Carte oubliée ? Cherchez l'élève").fill("mariama");
    const checkOut = match.getByRole("button", { name: "Pointer la sortie de Mariama Sow" });
    if (await checkOut.isVisible()) {
      await checkOut.click();
      await expect(director.getByText(/^Mariama Sow · sorti·e à \d{1,2} h \d{2}$/)).toBeVisible();
    }
    await expect(director.getByRole("list", { name: "Derniers passages" }).getByText("Mariama Sow")).toBeVisible();
    await director.getByRole("radio", { name: "Arrivées" }).click();

    // Une fois envoyée, l'arrivée est connue du serveur : la page rechargée la montre encore.
    await expect(async () => {
      await director.reload();
      await director.getByLabel("Carte oubliée ? Cherchez l'élève").fill("mariama");
      await expect(match.getByText(/arrivé·e à \d{1,2} h \d{2}/)).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await directorContext.close();

    // Le parent (Fatou Sow) voit l'heure d'arrivée de sa fille.
    const parentContext = await browser.newContext({ ...testInfo.project.use, baseURL });
    const parent = await parentContext.newPage();
    await loginWithPhone(parent, DEMO.parentPhone);
    await expect(parent).toHaveURL(/\/parent$/);
    await expect(parent.getByRole("link", { name: /Mariama Sow/ }).getByText(/^Arrivé·e à \d{1,2} h \d{2}$/)).toBeVisible();
    await parent.getByRole("link", { name: /Mariama Sow/ }).click();
    await expect(parent.getByText(/^Arrivé·e à l'école aujourd'hui à \d{1,2} h \d{2}$/)).toBeVisible();
    await expect(parent.getByText(/^Sorti·e de l'école aujourd'hui à \d{1,2} h \d{2}$/)).toBeVisible();
    await parentContext.close();
  });
});
