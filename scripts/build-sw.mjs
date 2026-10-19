// Compile le service worker (src/service-worker/sw.ts) en fichier statique public/sw.js.
// Lancé automatiquement avant `next build` (script « prebuild »).
//
// Choix data : on ne précharge que la page hors ligne. CSS, polices et JS sont mis en cache
// à la première visite (stratégies de @serwist/turbopack/worker), pour ne jamais télécharger
// d'avance des fichiers que le parent n'utilisera peut-être pas.
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? `${Date.now()}`;
const precache = [{ url: "/hors-ligne", revision }];

await build({
  entryPoints: [path.join(root, "src/service-worker/sw.ts")],
  outfile: path.join(root, "public/sw.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  sourcemap: false,
  legalComments: "none",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "self.__SW_MANIFEST": JSON.stringify(precache),
  },
  logLevel: "warning",
});

console.log(`✓ public/sw.js (précache : ${precache.map((entry) => entry.url).join(", ")} — révision ${revision.slice(0, 12)})`);
