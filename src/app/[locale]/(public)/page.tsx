import { BookOpenCheck, ClipboardCheck, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Page d'accueil provisoire : la page complète (modules, formules, démo) arrive au Lot 1.
export default async function HomePage() {
  const t = await getTranslations("landing");
  const tAuth = await getTranslations("auth.sidePanelPoints");
  const tFooter = await getTranslations("footer");

  const points = [
    { icon: BookOpenCheck, label: tAuth("grades"), tone: "bg-lavender-200" },
    { icon: Wallet, label: tAuth("payments"), tone: "bg-sun-200" },
    { icon: ClipboardCheck, label: tAuth("attendance"), tone: "bg-azure-200" },
  ];

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div aria-hidden className="absolute -top-40 -right-40 size-[36rem] rounded-full bg-lavender-200/70 blur-3xl" />
      <div aria-hidden className="absolute -bottom-48 -left-32 size-[30rem] rounded-full bg-azure-200/60 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <Link href="/connexion" className={buttonVariants({ variant: "outline" })}>
          {t("cta")}
        </Link>
      </header>

      <main className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-20">
        <div>
          <h1 className="text-4xl leading-[1.1] font-extrabold sm:text-5xl lg:text-6xl">{t("heroTitle")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{t("heroBody")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/connexion" className={buttonVariants({ size: "touch" })}>
              {t("cta")}
            </Link>
            <a href={`mailto:${tFooter("email")}`} className={buttonVariants({ size: "touch", variant: "sun" })}>
              {t("ctaDemo")}
            </a>
          </div>
        </div>

        <ul className="grid gap-4">
          {points.map(({ icon: Icon, label, tone }) => (
            <li key={label} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-float ring-1 ring-line/70">
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="size-6 text-ink" aria-hidden strokeWidth={1.75} />
              </span>
              <span className="text-base font-semibold text-ink">{label}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
