import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
/** URL d'un déploiement (staging) : on teste le site en ligne au lieu de lancer un serveur local. */
const REMOTE_URL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  // Une seule base partagée et des limites d'envoi de SMS par numéro : les parcours s'exécutent en série.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Build de production démarré à froid : une action serveur suivie du rechargement de la page dépasse parfois 5 s.
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: REMOTE_URL ?? `http://localhost:${PORT}`,
    locale: "fr-SN",
    timezoneId: "Africa/Dakar",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: REMOTE_URL
    ? undefined
    : {
        // Les tests tournent sur un build de production (le service worker et le hors ligne en dépendent).
        command: `npm run build && npm run start -- -p ${PORT}`,
        url: `http://localhost:${PORT}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
