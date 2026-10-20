/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import { Serwist, type PrecacheEntry, type RuntimeCaching, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Seules les requêtes de l'application passent par le service worker. Les autres domaines
 * (stockage Supabase : photos et documents des élèves, en liens signés) vont directement au réseau :
 * rien de privé ne reste dans le cache d'un téléphone parfois partagé, et la CSP de ce fichier
 * (default-src 'self') interdirait de toute façon au service worker de les télécharger.
 */
const sameOriginCache: RuntimeCaching[] = defaultCache.map((rule) => ({
  ...rule,
  matcher: (options) => {
    if (!options.sameOrigin) return false;
    const { matcher } = rule;
    if (typeof matcher === "function") return matcher(options);
    if (typeof matcher === "string") return options.url.href === new URL(matcher, self.location.href).href;
    return matcher.test(options.url.href);
  },
}));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: sameOriginCache,
  fallbacks: {
    entries: [
      {
        url: "/hors-ligne",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
