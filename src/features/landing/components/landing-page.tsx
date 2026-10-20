import type { ReactNode } from "react";
import {
  BellRing,
  BookOpenCheck,
  Bus,
  Check,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Megaphone,
  QrCode,
  Receipt,
  School,
  Smartphone,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Footer } from "@/components/layout/footer";
import { buttonVariants } from "@/components/ui/button";
import { PUBLIC_PLANS, yearlyPrice } from "@/config/plans";
import { Link } from "@/i18n/navigation";
import { formatInteger, formatXOF } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DemoForm } from "./demo-form";

/** Ancres des sections (liens du bandeau). */
const SECTIONS = { features: "fonctionnalites", pricing: "tarifs", demo: "demo", faq: "questions" } as const;

function Section({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24", className)}>
      {children}
    </section>
  );
}

function SectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-lg text-ink-soft">{body}</p>}
    </div>
  );
}

async function Header() {
  const t = await getTranslations("landing.nav");
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Fama School">
          <Logo />
        </Link>
        <nav aria-label={t("menu")} className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
          <a href={`#${SECTIONS.features}`} className="hover:text-ink">
            {t("features")}
          </a>
          <a href={`#${SECTIONS.pricing}`} className="hover:text-ink">
            {t("pricing")}
          </a>
          <a href={`#${SECTIONS.faq}`} className="hover:text-ink">
            {t("faq")}
          </a>
          <a href={`#${SECTIONS.demo}`} className="hover:text-ink">
            {t("demo")}
          </a>
        </nav>
        <Link href="/connexion" className={buttonVariants({ variant: "outline" })}>
          {t("login")}
        </Link>
      </div>
    </header>
  );
}

/** Téléphone dessiné : ce que reçoit un parent (présence, bulletin, paiement). */
async function PhoneMockup() {
  const t = await getTranslations("landing.phone");
  const items = [
    { icon: ClipboardCheck, tone: "bg-azure-100 text-azure-700", title: t("arrival"), detail: t("arrivalTime") },
    { icon: FileText, tone: "bg-lavender-100 text-lavender-700", title: t("report"), detail: t("reportDetail") },
    {
      icon: Receipt,
      tone: "bg-success-50 text-success-700",
      title: t("payment"),
      detail: `${t("paymentDetail")} · ${t("receipt")}`,
    },
    { icon: BookOpenCheck, tone: "bg-sun-100 text-sun-700", title: t("homework"), detail: null },
  ];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[19rem] select-none">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-lavender-200 via-azure-100 to-sun-100 blur-2xl" />
      <div className="rounded-[2.5rem] bg-ink p-2.5 shadow-float">
        <div className="overflow-hidden rounded-[2rem] bg-background">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <span className="text-xs font-bold text-ink">{t("title")}</span>
            <BellRing className="size-4 text-ink-soft" />
          </div>
          <div className="mx-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
            <span className="grid size-10 place-items-center rounded-full bg-lavender-200 text-sm font-bold text-ink">AD</span>
            <span className="text-sm font-semibold text-ink">{t("child")}</span>
          </div>
          <ul className="space-y-2.5 p-4">
            {items.map(({ icon: Icon, tone, title, detail }) => (
              <li key={title} className="flex gap-3 rounded-2xl bg-white p-3 shadow-card">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone)}>
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] leading-snug font-semibold text-ink">{title}</span>
                  {detail && <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

async function Hero() {
  const t = await getTranslations("landing.hero");
  const points = [
    { icon: Smartphone, label: t("points.free") },
    { icon: WifiOff, label: t("points.offline") },
    { icon: Wallet, label: t("points.mobileMoney") },
  ];
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="absolute -top-40 -right-40 size-[36rem] rounded-full bg-lavender-200/60 blur-3xl" />
      <div aria-hidden className="absolute -bottom-48 -left-32 size-[30rem] rounded-full bg-azure-200/50 blur-3xl" />
      <Section className="relative grid items-center gap-14 pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-ink-soft ring-1 ring-line">
            <span aria-hidden className="size-1.5 rounded-full bg-success-500" />
            {t("eyebrow")}
          </p>
          <h1 className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{t("body")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={`#${SECTIONS.demo}`} className={buttonVariants({ size: "touch", variant: "sun" })}>
              {t("ctaDemo")}
            </a>
            <Link href="/connexion" className={buttonVariants({ size: "touch", variant: "outline" })}>
              {t("ctaLogin")}
            </Link>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-soft">
            {points.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon className="size-4 text-azure-600" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <PhoneMockup />
      </Section>
    </div>
  );
}

async function Spaces() {
  const t = await getTranslations("landing.spaces");
  const spaces = [
    { key: "direction", icon: School, tone: "bg-lavender-200" },
    { key: "teachers", icon: GraduationCap, tone: "bg-sun-200" },
    { key: "parents", icon: Users, tone: "bg-azure-200" },
  ] as const;
  return (
    <Section>
      <SectionTitle title={t("title")} body={t("body")} />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {spaces.map(({ key, icon: Icon, tone }) => (
          <article key={key} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-line/70">
            <span className={cn("grid size-12 place-items-center rounded-xl text-ink", tone)}>
              <Icon className="size-6" aria-hidden strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg font-bold">{t(`${key}.title`)}</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              {(["first", "second", "third"] as const).map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-500" aria-hidden />
                  {t(`${key}.items.${item}`)}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}

async function Features() {
  const t = await getTranslations("landing.features");
  const features = [
    { key: "students", icon: Users },
    { key: "grades", icon: FileText },
    { key: "attendance", icon: QrCode },
    { key: "payments", icon: Wallet },
    { key: "messages", icon: Megaphone },
    { key: "transport", icon: Bus },
  ] as const;
  return (
    <div className="bg-white">
      <Section id={SECTIONS.features}>
        <SectionTitle title={t("title")} body={t("body")} />
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, icon: Icon }) => (
            <article key={key}>
              <span className="grid size-11 place-items-center rounded-xl bg-azure-50 text-azure-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 flex items-center gap-2 text-base font-bold">
                {t(`${key}.title`)}
                {key === "transport" && (
                  <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[11px] font-semibold text-sun-700">
                    {t("transport.badge")}
                  </span>
                )}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t(`${key}.body`)}</p>
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}

async function Recovery() {
  const t = await getTranslations("landing.recovery");
  return (
    <Section>
      <div className="grid gap-8 rounded-3xl bg-gradient-to-br from-azure-200 via-azure-100 to-lavender-100 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">{t("title")}</h2>
          <p className="mt-4 text-lg text-ink-soft">{t("body")}</p>
        </div>
        <div className="rounded-2xl bg-white/85 p-6 shadow-card">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{t("exampleLabel")}</p>
          <p className="mt-2 text-base leading-relaxed text-ink">{t("example")}</p>
        </div>
      </div>
    </Section>
  );
}

async function Pricing() {
  const t = await getTranslations("landing.pricing");
  const capacity = (index: number) => {
    const plan = PUBLIC_PLANS[index]!;
    if (plan.maxStudents === null) return t("beyond");
    const previous = PUBLIC_PLANS[index - 1]?.maxStudents;
    return previous
      ? t("from", { min: formatInteger(previous + 1), max: formatInteger(plan.maxStudents) })
      : t("upTo", { count: formatInteger(plan.maxStudents) });
  };
  const options = ["setup", "transport", "cards", "sms"] as const;

  return (
    <div className="bg-white">
      <Section id={SECTIONS.pricing}>
        <SectionTitle title={t("title")} body={t("body")} />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PUBLIC_PLANS.map((plan, index) => (
            <article
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl p-6 ring-1",
                plan.highlighted ? "bg-lavender-50 ring-2 ring-lavender-400" : "bg-background ring-line",
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-lavender-600 px-3 py-0.5 text-xs font-semibold text-white">
                  {t("popular")}
                </span>
              )}
              <h3 className="text-lg font-bold">{t(`plans.${plan.id}`)}</h3>
              <p className="mt-1 text-sm text-ink-soft">{capacity(index)}</p>
              <p className="mt-5">
                {plan.monthly ? (
                  <>
                    <span className="tabular text-3xl font-extrabold tracking-tight">{formatXOF(plan.monthly)}</span>
                    <span className="block text-sm text-muted-foreground">{t("perMonth")}</span>
                  </>
                ) : (
                  <span className="text-3xl font-extrabold tracking-tight">{t("onQuote")}</span>
                )}
              </p>
              <p className="mt-2 min-h-10 text-xs text-muted-foreground">
                {plan.monthly ? t("yearly", { price: formatXOF(yearlyPrice(plan.monthly)) }) : null}
              </p>
              <a
                href={`#${SECTIONS.demo}`}
                className={cn(buttonVariants({ variant: plan.highlighted ? "default" : "outline" }), "mt-auto")}
              >
                {t("choose")}
              </a>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-base font-bold">{t("includedTitle")}</h3>
            <ul className="mt-4 grid gap-2.5 text-sm text-ink-soft sm:grid-cols-2">
              {(["students", "grades", "attendance", "programme", "parents", "receipts"] as const).map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-500" aria-hidden />
                  {t(`included.${item}`)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-bold">{t("optionsTitle")}</h3>
            <dl className="mt-4 divide-y divide-line rounded-xl ring-1 ring-line">
              {options.map((key) => (
                <div key={key} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:justify-between sm:gap-6">
                  <dt className="text-ink">{t(`options.${key}.name`)}</dt>
                  <dd className="shrink-0 text-ink-soft sm:text-right">
                    {t(`options.${key}.price`)}
                    {key === "setup" && <span className="block text-xs text-success-700">{t("options.setup.note")}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>
    </div>
  );
}

async function Demo() {
  const t = await getTranslations("landing.demo");
  return (
    <Section id={SECTIONS.demo} className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      <div>
        <SectionTitle title={t("title")} body={t("body")} />
        <p className="mt-6 rounded-xl bg-sun-100 px-4 py-3 text-sm text-ink">{t("pilot")}</p>
      </div>
      <DemoForm />
    </Section>
  );
}

async function Faq() {
  const t = await getTranslations("landing.faq");
  const items = (["network", "install", "payments", "import", "data"] as const).map((key) => ({
    q: t(`items.${key}.q`),
    a: t(`items.${key}.a`),
  }));
  return (
    <div className="bg-white">
      <Section id={SECTIONS.faq} className="max-w-3xl">
        <SectionTitle title={t("title")} />
        <div className="mt-8 divide-y divide-line">
          {items.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
                {item.q}
                <span aria-hidden className="text-xl text-ink-soft transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </div>
  );
}

/** Page d'accueil Fama School : promesse, espaces, modules, formules et tarifs, demande de démo. */
export async function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Spaces />
        <Features />
        <Recovery />
        <Pricing />
        <Demo />
        <Faq />
      </main>
      <Footer className="mx-auto max-w-6xl" />
    </>
  );
}
