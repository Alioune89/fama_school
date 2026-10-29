import { CalendarDays, GraduationCap, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/brand/logo";
import { formatDate, formatXOF } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import type { PublicSite } from "../queries";

const section = "mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16";

/** Site vitrine d'une école : une seule page, pensée d'abord pour le téléphone. */
export async function PublicSiteView({ site, preview }: { site: PublicSite; preview: boolean }) {
  const [t, tEvents] = await Promise.all([getTranslations("schoolSite.public"), getTranslations("events")]);
  const whatsappHref = site.whatsapp
    ? `https://wa.me/${site.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(t("whatsappMessage", { school: site.name }))}`
    : null;
  const nav = [
    site.about && { id: "presentation", label: t("nav.about") },
    site.cycles.length > 0 && { id: "cursus", label: t("nav.cursus") },
    site.admissions && { id: "admissions", label: t("nav.admissions") },
    { id: "contact", label: t("nav.contact") },
  ].filter((item): item is { id: string; label: string } => Boolean(item));

  return (
    <div className="min-h-dvh bg-white text-ink" style={{ "--accent": site.accentColor } as React.CSSProperties}>
      {preview && !site.published && (
        <p role="status" className="bg-sun-200 px-4 py-2 text-center text-sm font-medium">
          {t("previewBanner")}
        </p>
      )}

      <header className="sticky top-0 z-10 border-b border-line/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          {site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo servi par le stockage public Supabase
            <img src={site.logoUrl} alt="" className="size-10 rounded-lg object-contain" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
              <GraduationCap className="size-5" aria-hidden />
            </span>
          )}
          <span className="min-w-0 truncate font-semibold">{site.name}</span>
          <nav aria-label={t("nav.label")} className="ml-auto hidden gap-5 text-sm text-ink-soft md:flex">
            {nav.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="hover:text-ink">
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="#contact"
            className="ml-auto shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white md:ml-0"
          >
            {t("contactCta")}
          </a>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[var(--accent)] text-white">
        {site.heroUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par le stockage public Supabase */}
            <img src={site.heroUrl} alt="" fetchPriority="high" className="absolute inset-0 -z-10 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/45 to-black/20" aria-hidden />
          </>
        )}
        <div className="mx-auto flex min-h-[26rem] max-w-5xl flex-col justify-end gap-4 px-4 py-12 sm:min-h-[30rem] sm:px-6 sm:py-16">
          {site.city && (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85">
              <MapPin className="size-4" aria-hidden />
              {site.city}
            </p>
          )}
          <h1 className="max-w-3xl text-3xl leading-tight font-bold text-white sm:text-5xl">{site.name}</h1>
          {site.tagline && <p className="max-w-2xl text-lg text-white/90 sm:text-xl">{site.tagline}</p>}
          <div className="mt-2 flex flex-wrap gap-3">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-ink"
              >
                <MessageCircle className="size-5" aria-hidden />
                {t("whatsappCta")}
              </a>
            )}
            {site.phone && (
              <a
                href={`tel:${site.phone}`}
                className="inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold text-white ring-1 ring-white/70"
              >
                <Phone className="size-5" aria-hidden />
                {t("callCta")}
              </a>
            )}
          </div>
        </div>
      </section>

      {site.stats.length > 0 && (
        <section aria-label={t("statsLabel")} className="border-b border-line/70 bg-azure-50/40">
          <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {site.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="text-sm text-ink-soft">{stat.label}</dt>
                <dd className="text-3xl font-bold text-[var(--accent)]">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {site.about && (
        <section id="presentation" className={section}>
          <Heading>{t("aboutTitle")}</Heading>
          <p className="max-w-3xl text-base leading-relaxed whitespace-pre-line text-ink-soft">{site.about}</p>
        </section>
      )}

      {site.cycles.length > 0 && (
        <section id="cursus" className={`${section} border-t border-line/70`}>
          <Heading>{t("cursusTitle")}</Heading>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {site.cycles.map((cycle) => (
              <li key={cycle.label} className="rounded-xl p-5 ring-1 ring-line">
                <h3 className="font-semibold">{cycle.label}</h3>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {cycle.levels.map((level) => (
                    <li key={level} className="rounded-full bg-azure-50 px-2.5 py-1 text-xs font-medium text-ink-soft">
                      {level}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {site.gallery.length > 0 && (
        <section aria-labelledby="galerie" className={`${section} border-t border-line/70`}>
          <Heading id="galerie">{t("galleryTitle")}</Heading>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {site.gallery.map((url) => (
              <li key={url} className="aspect-[4/3] overflow-hidden rounded-lg bg-azure-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par le stockage public Supabase */}
                <img src={url} alt="" loading="lazy" className="size-full object-cover" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {(site.admissions || site.fees.length > 0) && (
        <section id="admissions" className={`${section} grid gap-10 border-t border-line/70 lg:grid-cols-2`}>
          {site.admissions && (
            <div>
              <Heading>{t("admissionsTitle")}</Heading>
              <p className="leading-relaxed whitespace-pre-line text-ink-soft">{site.admissions}</p>
            </div>
          )}
          {site.fees.length > 0 && (
            <div>
              <Heading>{t("feesTitle")}</Heading>
              <dl className="divide-y divide-line rounded-xl px-4 ring-1 ring-line">
                {site.fees.map((fee) => (
                  <div key={fee.label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-3 text-sm">
                    <dt className="text-ink-soft">{fee.label}</dt>
                    <dd className="font-semibold tabular-nums">{formatXOF(fee.amount)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">{t("feesNote")}</p>
            </div>
          )}
        </section>
      )}

      {site.events.length > 0 && (
        <section aria-labelledby="agenda" className={`${section} border-t border-line/70`}>
          <Heading id="agenda">{t("eventsTitle")}</Heading>
          <ul className="grid gap-3 sm:grid-cols-2">
            {site.events.map((event) => (
              <li key={`${event.title}-${event.startsOn}`} className="flex items-start gap-3 rounded-xl p-4 ring-1 ring-line">
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" aria-hidden />
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {tEvents(`kinds.${event.kind}`)} ·{" "}
                    {event.startsOn === event.endsOn
                      ? formatDate(event.startsOn, { day: "numeric", month: "long" })
                      : tEvents("range", {
                          from: formatDate(event.startsOn, { day: "numeric", month: "long" }),
                          to: formatDate(event.endsOn, { day: "numeric", month: "long" }),
                        })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {site.faq.length > 0 && (
        <section aria-labelledby="faq" className={`${section} border-t border-line/70`}>
          <Heading id="faq">{t("faqTitle")}</Heading>
          <div className="max-w-3xl divide-y divide-line rounded-xl ring-1 ring-line">
            {site.faq.map((item) => (
              <details key={item.question} className="group px-4 py-3">
                <summary className="cursor-pointer list-none py-1 font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.question}
                    <span className="text-xl leading-none text-ink-soft transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </span>
                </summary>
                <p className="pt-2 pb-1 text-sm leading-relaxed whitespace-pre-line text-ink-soft">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section id="contact" className="bg-ink text-white">
        <div className={`${section} grid gap-8 md:grid-cols-2`}>
          <div>
            <h2 className="text-2xl font-bold text-white">{t("contactTitle")}</h2>
            <p className="mt-2 text-white/75">{t("contactBody")}</p>
          </div>
          <ul className="space-y-4">
            {site.address && (
              <ContactLine icon={<MapPin className="size-5" aria-hidden />} label={t("address")}>
                {site.address}
              </ContactLine>
            )}
            {site.phone && (
              <ContactLine icon={<Phone className="size-5" aria-hidden />} label={t("phone")}>
                <a href={`tel:${site.phone}`} className="underline-offset-4 hover:underline">
                  {formatPhone(site.phone)}
                </a>
              </ContactLine>
            )}
            {whatsappHref && (
              <ContactLine icon={<MessageCircle className="size-5" aria-hidden />} label={t("whatsapp")}>
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                  {formatPhone(site.whatsapp!)}
                </a>
              </ContactLine>
            )}
            {site.email && (
              <ContactLine icon={<Mail className="size-5" aria-hidden />} label={t("email")}>
                <a href={`mailto:${site.email}`} className="underline-offset-4 hover:underline">
                  {site.email}
                </a>
              </ContactLine>
            )}
          </ul>
        </div>
        <p className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-5 text-xs text-white/60">
          <LogoMark className="size-4" />
          {t("poweredBy")}
        </p>
      </section>
    </div>
  );
}

function Heading({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-6 flex items-center gap-3 text-2xl font-bold sm:text-3xl">
      <span className="h-7 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
      {children}
    </h2>
  );
}

function ContactLine({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 text-white/70">{icon}</span>
      <div>
        <p className="text-xs tracking-wide text-white/60 uppercase">{label}</p>
        <p className="font-medium">{children}</p>
      </div>
    </li>
  );
}
