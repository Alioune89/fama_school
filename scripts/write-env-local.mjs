// Écrit (ou met à jour) .env.local avec les clés du Supabase local (`npm run db:env`).
// Les autres variables déjà présentes dans .env.local sont conservées.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env.local");

const status = JSON.parse(
  execFileSync("npx", ["supabase", "status", "-o", "json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }),
);

const values = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  SUPABASE_SECRET_KEY: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
};

for (const [key, value] of Object.entries(values)) {
  if (!value) throw new Error(`Valeur introuvable pour ${key} : Supabase local est-il démarré (npm run db:start) ?`);
}

const lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : [];
const kept = lines.filter((line) => !Object.keys(values).some((key) => line.startsWith(`${key}=`)));
const next = [...kept.filter((line, index) => line !== "" || index < kept.length - 1), ...Object.entries(values).map(([k, v]) => `${k}=${v}`)];

writeFileSync(envPath, `${next.join("\n").trim()}\n`);
console.log(`✓ .env.local mis à jour (${status.API_URL})`);
