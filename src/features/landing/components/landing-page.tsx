import type { ReactNode } from "react";
import {
  BellRing,
  BookOpenCheck,
  Bus,
  Check,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MessageSquareText,
  QrCode,
  Receipt,
  School,
  Smartphone,
  Users,
  Wallet,
  WifiOff,
  Wrench,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { Footer } from "@/components/layout/footer";
import { buttonVariants } from "@/components/ui/button";
import { whatsappLink } from "@/config/contact";
import { PUBLIC_PLANS, yearlyPrice } from "@/config/plans";
import { Link } from "@/i18n/navigation";
import { bigNumber, formatInteger, formatXOF } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DemoForm } from "./demo-form";

/** Ancres des sections (liens du bandeau). */
const SECTIONS = { features: "fonctionnalites", pricing: "tarifs", demo: "demo", faq: "questions" } as const;

function Section({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:py-24", className)}>
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

/**
 * Arrivée des notifications, en boucle de 12 s : les quatre cartes entrent en 3 s (le téléphone n'a pas l'air
 * vide au premier regard), la cloche sonne à chacune, puis tout recommence.
 */
const NOTIFICATION_STARTS = [1, 9, 17, 25];
const PHONE_CSS = `
${NOTIFICATION_STARTS.map(
  (start, index) => `@keyframes phone-notification-${index} {
  0%, ${start}% { opacity: 0; transform: translateY(14px) scale(0.97); }
  ${start + 4}%, 88% { opacity: 1; transform: none; }
  96%, 100% { opacity: 0; transform: translateY(-6px); }
}`,
).join("\n")}
@keyframes phone-bell {
  0%, 100% { transform: rotate(0); }
  ${NOTIFICATION_STARTS.map((start) => `${start + 1}% { transform: rotate(16deg); } ${start + 2}% { transform: rotate(-14deg); } ${start + 3}% { transform: rotate(0); }`).join("\n  ")}
}
@keyframes phone-badge {
  0%, ${NOTIFICATION_STARTS[0]! + 1}% { opacity: 0; transform: scale(0); }
  ${NOTIFICATION_STARTS[0]! + 4}%, 88% { opacity: 1; transform: scale(1); }
  96%, 100% { opacity: 0; transform: scale(0); }
}
.phone-notification { animation: 12s ease-out infinite both; }
.phone-bell { animation: phone-bell 12s ease-in-out infinite; transform-origin: 50% 10%; }
.phone-badge { animation: phone-badge 12s ease-out infinite both; }
@media (prefers-reduced-motion: reduce) {
  .phone-notification, .phone-bell, .phone-badge { animation: none; }
}`;

/** Téléphone dessiné : ce que reçoit un parent (présence, bulletin, paiement), notification après notification. */
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
    // Sur téléphone, le haut de page suffit : l'illustration est réservée aux grands écrans (page plus courte).
    <div aria-hidden className="relative mx-auto hidden w-full max-w-[19rem] select-none lg:block">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-lavender-200 via-azure-100 to-sun-100 blur-2xl" />
      <style dangerouslySetInnerHTML={{ __html: PHONE_CSS }} />
      <div className="rounded-[2.5rem] bg-ink p-2.5 shadow-float">
        <div className="overflow-hidden rounded-[2rem] bg-background">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <span className="text-xs font-bold text-ink">{t("title")}</span>
            <span className="relative">
              <BellRing className="phone-bell size-4 text-ink-soft" />
              <span className="phone-badge absolute -top-0.5 -right-0.5 size-2 rounded-full bg-danger-500 ring-2 ring-background" />
            </span>
          </div>
          <div className="mx-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
            <span className="grid size-10 place-items-center rounded-full bg-lavender-200 text-sm font-bold text-ink">AD</span>
            <span className="text-sm font-semibold text-ink">{t("child")}</span>
          </div>
          <ul className="space-y-2.5 p-4">
            {items.map(({ icon: Icon, tone, title, detail }, index) => (
              <li
                key={title}
                className="phone-notification flex gap-3 rounded-2xl bg-white p-3 shadow-card"
                style={{ animationName: `phone-notification-${index}` }}
              >
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
    {
      key: "direction",
      icon: School,
      tone: "bg-lavender-200",
      items: [t("direction.items.first"), t("direction.items.second"), t("direction.items.third"), t("direction.items.fourth")],
    },
    {
      key: "teachers",
      icon: GraduationCap,
      tone: "bg-sun-200",
      items: [t("teachers.items.first"), t("teachers.items.second"), t("teachers.items.third")],
    },
    {
      key: "parents",
      icon: Users,
      tone: "bg-azure-200",
      items: [t("parents.items.first"), t("parents.items.second"), t("parents.items.third")],
    },
  ] as const;
  return (
    <Section id={SECTIONS.features}>
      <SectionTitle title={t("title")} body={t("body")} />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {spaces.map(({ key, icon: Icon, tone, items }) => (
          <article key={key} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-line/70">
            <span className={cn("grid size-12 place-items-center rounded-xl text-ink", tone)}>
              <Icon className="size-6" aria-hidden strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-lg font-bold">{t(`${key}.title`)}</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              {items.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
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
  // Options : une carte chacune ; la pastille dit ce qui est offert ou pas encore disponible.
  const options = [
    { key: "setup", icon: Wrench, badge: { label: t("options.setup.badge"), tone: "bg-success-50 text-success-700" } },
    { key: "transport", icon: Bus, badge: { label: t("options.transport.badge"), tone: "bg-sun-100 text-sun-700" } },
    { key: "cards", icon: QrCode, badge: null },
    { key: "sms", icon: MessageSquareText, badge: null },
  ] as const;

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
                    <span className="tabular big-number text-3xl font-extrabold tracking-tight">
                      {bigNumber(formatXOF(plan.monthly))}
                    </span>
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

        <div className="mt-14">
          <h3 className="text-xl font-bold">{t("optionsTitle")}</h3>
          <p className="mt-1 text-sm text-ink-soft">{t("optionsBody")}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {options.map(({ key, icon: Icon, badge }) => (
              <li key={key} className="flex flex-col rounded-2xl bg-background p-5 ring-1 ring-line">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-azure-50 text-azure-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {badge && (
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", badge.tone)}>{badge.label}</span>
                  )}
                </div>
                <h4 className="mt-4 font-bold text-ink">{t(`options.${key}.name`)}</h4>
                <p className="mt-1 mb-4 text-sm leading-relaxed text-ink-soft">{t(`options.${key}.detail`)}</p>
                <p className="mt-auto border-t border-line pt-4">
                  <span className="block font-bold text-ink">{t(`options.${key}.price`)}</span>
                  <span className="block text-xs text-muted-foreground">{t(`options.${key}.unit`)}</span>
                </p>
              </li>
            ))}
          </ul>
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
        {/* Au Sénégal, beaucoup préfèrent écrire directement : message pré-rempli, réponse sur WhatsApp. */}
        <a
          href={whatsappLink(t("whatsappText"))}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "touch", variant: "outline" }), "mt-6")}
        >
          <WhatsAppIcon />
          {t("whatsapp")}
        </a>
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

/** Page d'accueil Fama School : promesse, impayés, un espace par public, formules, demande de démo, questions. */
export async function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Recovery />
        <Spaces />
        <Pricing />
        <Demo />
        <Faq />
      </main>
      <Footer className="mx-auto max-w-6xl" />
    </>
  );
}
