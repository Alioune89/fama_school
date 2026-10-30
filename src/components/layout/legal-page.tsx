import { Fragment } from "react";
import { ArrowLeft } from "lucide-react";
import { getMessages, getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import { Footer } from "./footer";

type Section = { title: string; body: string };

/** Espace insécable avant « : ; ? ! » : la ponctuation française ne passe jamais seule à la ligne. */
const frenchSpacing = (text: string) => text.replace(/ ([:;?!])/g, "\u00a0$1");

/** Paragraphes séparés par une ligne vide ; les lignes « - … » forment une liste. */
function Body({ text }: { text: string }) {
  return frenchSpacing(text)
    .split("\n\n")
    .map((block, index) => {
      const lines = block.split("\n");
      const intro = lines.filter((line) => !line.startsWith("- "));
      const items = lines.filter((line) => line.startsWith("- ")).map((line) => line.slice(2));
      return (
        <Fragment key={index}>
          {intro.length > 0 && <p>{intro.join(" ")}</p>}
          {items.length > 0 && (
            <ul className="list-disc space-y-1.5 pl-5">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Fragment>
      );
    });
}

/** Page juridique (conditions d'utilisation, confidentialité) : sommaire, sections numérotées, date de mise à jour. */
export async function LegalPage({ document }: { document: "terms" | "privacy" }) {
  const [t, messages] = await Promise.all([getTranslations("legal"), getMessages()]);
  // Sections dans l'ordre du fichier de textes (s1, s2…), langue en cours avec repli sur le français.
  const sections: Section[] = Object.values(messages.legal[document].sections);

  return (
    <>
      <header className="border-b border-line/60 bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Fama School">
            <Logo />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            {t("back")}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t(`${document}.title`)}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t(`${document}.intro`)}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("updated")}</p>

        <nav aria-label={t(`${document}.title`)} className="mt-8 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/70">
          <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.title}>
                <a href={`#section-${index + 1}`} className="text-ink-soft hover:text-ink">
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((section, index) => (
            <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-6">
              <h2 className="text-xl font-bold">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-ink-soft">
                <Body text={section.body} />
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer className="mx-auto max-w-3xl" />
    </>
  );
}
