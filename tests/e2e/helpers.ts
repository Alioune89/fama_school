import { expect, type Page } from "@playwright/test";

/** Comptes de démonstration (voir supabase/seed.sql). */
export const DEMO = {
  password: "FamaSchool2026",
  otp: "123456",
  admin: "admin@famaschool.test",
  director: "directeur@famaschool.test",
  parentPhone: "77 000 00 01",
  teacherPhone: "77 000 00 02",
  censorPhone: "77 000 00 03",
  alAmineDirectorPhone: "77 000 00 04",
} as const;

export async function loginWithPhone(page: Page, phone: string, code: string = DEMO.otp) {
  await page.goto("/connexion");
  await page.getByLabel("Numéro de téléphone").fill(phone);
  await page.getByRole("button", { name: "Recevoir le code" }).click();
  await expect(page).toHaveURL(/\/connexion\/code/);
  await page.getByLabel("Code de vérification").fill(code);
}

export async function loginWithEmail(page: Page, email: string, password: string = DEMO.password) {
  await page.goto("/connexion");
  await page.getByRole("tab", { name: "E-mail (personnel)" }).click();
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}
