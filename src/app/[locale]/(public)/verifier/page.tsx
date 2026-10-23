import { Suspense } from "react";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { redirect } from "@/i18n/navigation";
import { VerifyForm } from "./verify-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("verify");
  return { title: t("title"), robots: { index: false } };
}

/** Un code envoyé par le formulaire (?code=) mène à sa page de vérification. */
async function CodeRedirect({ searchParams }: { searchParams: PageProps<"/[locale]/verifier">["searchParams"] }) {
  const [{ code }, locale] = await Promise.all([searchParams, getLocale()]);
  const value =
    typeof code === "string"
      ? code
          .replace(/[^0-9A-Za-z]/g, "")
          .toUpperCase()
          .slice(0, 20)
      : "";
  if (value) redirect({ href: `/verifier/${value}`, locale });
  return null;
}

/** Vérifier un bulletin : saisie du code imprimé sous le QR code. */
export default async function VerifyPage({ searchParams }: PageProps<"/[locale]/verifier">) {
  const t = await getTranslations("verify");
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-4 py-10">
      <Logo />
      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <ShieldCheck className="size-8 text-azure-600" aria-hidden />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <Suspense fallback={null}>
          <CodeRedirect searchParams={searchParams} />
        </Suspense>
        <VerifyForm />
      </section>
    </main>
  );
}
