import { existsSync, readFileSync } from "node:fs";
import { expect, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Comptes de démonstration (voir supabase/seed.sql). Sur le staging, le mot de passe du directeur
 * est changé après le seed (supabase/staging/secure-demo-accounts.sql) : E2E_DEMO_PASSWORD le fournit.
 */
export const DEMO = {
  password: process.env.E2E_DEMO_PASSWORD ?? "FamaSchool2026",
  otp: "123456",
  admin: "admin@famaschool.test",
  director: "directeur@famaschool.test",
  parentPhone: "77 000 00 01",
  teacherPhone: "77 000 00 02",
  censorPhone: "77 000 00 03",
  alAmineDirectorPhone: "77 000 00 04",
  accountantPhone: "77 099 00 07",
  secretaryPhone: "77 099 00 08",
  supervisorPhone: "77 099 00 09",
} as const;

export async function loginWithPhone(page: Page, phone: string, code: string = DEMO.otp, { acceptWelcome = true } = {}) {
  await page.goto("/connexion");
  await page.getByLabel("Numéro de téléphone").fill(phone);
  await page.getByRole("button", { name: "Recevoir le code" }).click();
  // Un SMS toutes les 5 s par numéro (supabase/config.toml) : deux tests qui se suivent réessaient une fois.
  try {
    await expect(page).toHaveURL(/\/connexion\/code/, { timeout: 7_000 });
  } catch {
    await page.getByRole("button", { name: "Recevoir le code" }).click();
    await expect(page).toHaveURL(/\/connexion\/code/);
  }
  await page.getByLabel("Code de vérification").fill(code);
  if (acceptWelcome && code === DEMO.otp) await acceptWelcomeIfShown(page);
}

/**
 * Première connexion d'un parent : la page de bienvenue demande d'accepter le suivi scolaire avant d'entrer.
 * Les parcours qui ne testent pas cette page l'acceptent ici (voir consents.spec.ts pour la page elle-même).
 */
export async function acceptWelcomeIfShown(page: Page) {
  await expect(page).not.toHaveURL(/\/connexion\/code/, { timeout: 15_000 });
  // Redirections de l'entrée dans l'espace terminées.
  await page.waitForLoadState("networkidle");
  if (!/\/bienvenue$/.test(new URL(page.url()).pathname)) return;
  const data = page.getByRole("switch", { name: "Suivi scolaire de mes enfants" });
  await expect(async () => {
    await data.click();
    await expect(data).toBeChecked({ timeout: 1500 });
  }).toPass();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).not.toHaveURL(/\/bienvenue$/);
}

export async function loginWithEmail(page: Page, email: string, password: string = DEMO.password) {
  await page.goto("/connexion");
  await page.getByRole("tab", { name: "E-mail (personnel)" }).click();
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

/**
 * Clique jusqu'à ce que `expected` apparaisse : un bouton rendu par le serveur ne réagit qu'une fois
 * la page interactive (premier clic parfois perdu sur une page qui vient de s'afficher).
 */
export async function clickUntilVisible(target: Locator, expected: Locator) {
  await expect(async () => {
    await target.click();
    await expect(expected).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
}

/**
 * Émet les mensualités du mois n° `monthIndex` de l'année (0 : premier mois facturé) jusqu'à ce que `name` ait
 * une facture vivante (non annulée) ce mois-là. Chaque test et chaque format travaille sur son propre mois :
 * les tests s'exécutent en alternance sur la même base. L'émission étant sans doublon, la réessayer est sans risque.
 */
export async function issueInvoicesFor(page: Page, name: string, monthIndex: number) {
  const dialog = page.getByRole("dialog", { name: "Émettre des factures" });
  let month = "";
  const liveInvoices = () =>
    page.getByRole("list", { name: "Factures" }).getByRole("link").filter({ hasText: name, hasNotText: "Annulée" });
  await expect(async () => {
    await page.goto("/direction/finances/factures");
    await clickUntilVisible(page.getByRole("button", { name: "Émettre des factures" }), dialog);
    const select = dialog.getByLabel("Factures à émettre");
    await select.selectOption({ index: monthIndex });
    month = await select.inputValue();
    await dialog.getByRole("button", { name: "Émettre", exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.goto(`/direction/finances/factures?mois=${month}&q=${encodeURIComponent(name)}`);
    await expect(liveInvoices()).toHaveCount(1, { timeout: 3000 });
  }).toPass({ timeout: 45_000 });
  return { month, liveInvoices: liveInvoices() };
}

/**
 * Client Supabase « service » pour préparer une situation impossible à créer par l'interface (une facture déjà
 * échue, par exemple). Base locale ou de CI seulement : clés lues dans l'environnement ou dans .env.local.
 */
export function adminClient() {
  const env: Record<string, string | undefined> = { ...process.env };
  if (!env.SUPABASE_SECRET_KEY && existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match && !env[match[1]!]) env[match[1]!] = match[2];
    }
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
