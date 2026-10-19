import { BookOpenCheck, ClipboardCheck, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";

/** Écrans d'accès : panneau de marque à gauche (grand écran), formulaire centré à droite. */
export default async function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("auth");

  const points = [
    { icon: BookOpenCheck, label: t("sidePanelPoints.grades") },
    { icon: Wallet, label: t("sidePanelPoints.payments") },
    { icon: ClipboardCheck, label: t("sidePanelPoints.attendance") },
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-azure-400 via-azure-600 to-lavender-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-32 -left-20 size-[26rem] rounded-full bg-sun-200/20" />
        <Link href="/" className="relative inline-flex w-fit items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2">
          <Logo />
        </Link>
        <div className="relative max-w-md">
          <p className="text-3xl leading-tight font-bold">{t("sidePanelTitle")}</p>
          <ul className="mt-10 space-y-4">
            {points.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-base font-medium">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="size-5" aria-hidden strokeWidth={1.75} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/80">Fama School</p>
      </aside>

      <div className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" className="mx-auto mb-10 lg:hidden">
          <Logo />
        </Link>
        <div className="m-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
