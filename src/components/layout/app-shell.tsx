import { Suspense, type ReactNode } from "react";
import { requireSpace } from "@/lib/auth/session";
import type { Space } from "@/lib/auth/spaces";
import { Footer } from "./footer";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Vérifie l'accès à l'espace sans bloquer l'affichage de la coquille statique. */
async function SpaceGuard({ space }: { space: Space }) {
  await requireSpace(space);
  return null;
}

/**
 * Coquille commune aux espaces (d'après les maquettes) : barre latérale, barre du haut, contenu, pied de page.
 * Tout ce qui ne dépend pas de l'utilisateur est prérendu ; l'identité et les données arrivent en streaming.
 * À l'impression (cartes d'élève), seule la page s'imprime.
 */
export function AppShell({ space, children }: { space: Space; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      <div className="contents print:hidden">
        <Sidebar space={space} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="contents print:hidden">
          <Topbar space={space} />
        </div>
        <main id="contenu" className="flex-1 px-4 pt-2 pb-28 sm:px-6 lg:px-8 lg:pb-10 print:p-0">
          <Suspense fallback={null}>
            <SpaceGuard space={space} />
          </Suspense>
          {children}
        </main>
        <Footer className="hidden lg:flex print:hidden" />
      </div>
      <div className="contents print:hidden">
        <MobileNav space={space} />
      </div>
    </div>
  );
}
