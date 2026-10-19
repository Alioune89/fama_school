import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { isProtectedPath, stripLocalePrefix } from "@/lib/auth/spaces";
import { refreshSession } from "@/lib/supabase/proxy";

const intlMiddleware = createIntlMiddleware(routing);
const GUEST_ONLY_PREFIXES = ["/connexion"];

function redirectTo(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

/**
 * 1. Rafraîchit la session Supabase (avant toute réponse).
 * 2. Contrôle optimiste : un visiteur non connecté ne voit pas les espaces privés.
 *    Les vrais contrôles (rôle, école) sont faits côté serveur et par la RLS.
 * 3. Résout la langue (français sans préfixe, wolof sous /wo).
 */
export default async function proxy(request: NextRequest) {
  const session = await refreshSession(request);
  const { locale, path } = stripLocalePrefix(request.nextUrl.pathname, routing.locales);
  const prefix = locale && locale !== routing.defaultLocale ? `/${locale}` : "";

  if (!session.userId && isProtectedPath(path)) {
    return session.applyTo(redirectTo(request, `${prefix}/connexion`, { suite: path + request.nextUrl.search }));
  }

  if (session.userId && GUEST_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return session.applyTo(redirectTo(request, `${prefix}/choisir-espace`));
  }

  return session.applyTo(intlMiddleware(request));
}

export const config = {
  // Tout sauf l'API, les fichiers internes, le service worker et les fichiers statiques.
  matcher: ["/((?!api|_next|_vercel|serwist|.*\\..*).*)"],
};
