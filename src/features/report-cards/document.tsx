import type { getTranslations } from "next-intl/server";
import type { ReportCardData, ReportCardSection } from "./build";

/**
 * Bulletin d'un élève : une page A4 (programme français), et une seconde page en arabe pour le bulletin
 * double franco-arabe. Composant sans état ni hook : rendu dans l'application (aperçu) et en HTML
 * statique pour le PDF (src/features/report-cards/pdf.ts). Mise en page : styles.ts.
 */

type Translator = Awaited<ReturnType<typeof getTranslations<"reportCards">>>;

const SCALE_MAX = { ten: 10, twenty: 20 } as const;

/** Moyenne comme sur un bulletin : 12,50. */
const fr = (value: number) => value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const frDate = (value: string) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Libellés de la page arabe du bulletin double (texte fixe du document, quelle que soit la langue de l'application). */
const AR = {
  title: "كشف النقاط",
  program: "البرنامج العربي",
  student: "التلميذ",
  matricule: "الرقم",
  class: "القسم",
  subject: "المادة",
  coefficient: "المعامل",
  average: "المعدل",
  points: "المجموع",
  rank: "الترتيب",
  classAverage: "معدل القسم",
  appreciation: "الملاحظة",
  total: "المجموع العام",
  sectionAverage: "معدل البرنامج العربي",
  teacher: "الأستاذ",
  director: "المدير",
  parent: "ولي الأمر",
} as const;

type Props = {
  data: ReportCardData;
  t: Translator;
  code: string;
  verifyUrl: string;
  /** QR code de vérification, en SVG. */
  qrSvg: string;
  logoUrl: string | null;
};

function Header({ data, logoUrl, title, subtitle }: Pick<Props, "data" | "logoUrl"> & { title: string; subtitle: string }) {
  const contact = [data.school.address, data.school.city, data.school.phone, data.school.email].filter(Boolean).join(" · ");
  return (
    <header className="rc-header">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- HTML statique du PDF, sans next/image.
        <img className="rc-logo" src={logoUrl} alt="" />
      ) : (
        <div className="rc-logo-placeholder" aria-hidden>
          {data.school.name.slice(0, 1)}
        </div>
      )}
      <div>
        <p className="rc-school">{data.school.name}</p>
        {contact && (
          <p className="rc-muted rc-small" style={{ margin: 0 }}>
            {contact}
          </p>
        )}
      </div>
      <div className="rc-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function Footer({ t, code, verifyUrl, qrSvg }: Pick<Props, "t" | "code" | "verifyUrl" | "qrSvg">) {
  return (
    <footer className="rc-footer">
      <div className="rc-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <div className="rc-small">
        <p style={{ margin: 0, fontWeight: 700 }}>{t("verifyTitle")}</p>
        <p className="rc-muted" style={{ margin: "0.5mm 0 0" }}>
          {t("verifyHint")} <span className="rc-code">{verifyUrl}</span>
        </p>
        <p className="rc-muted" style={{ margin: "0.5mm 0 0" }}>
          {t("code")} <span className="rc-code">{code}</span>
        </p>
      </div>
    </footer>
  );
}

function SubjectsTable({
  data,
  section,
  t,
  arabic,
}: {
  data: ReportCardData;
  section: ReportCardSection;
  t: Translator;
  arabic: boolean;
}) {
  const max = data.scale === "appreciation" ? null : SCALE_MAX[data.scale];
  const label = (key: keyof typeof AR, french: string) => (arabic ? AR[key] : french);
  // Page arabe : le rang en chiffres ; page française : 1er, 2e ex æquo.
  const rank = (value: { rank: number; exAequo: boolean } | null) =>
    !value ? "—" : arabic ? String(value.rank) : t(value.exAequo ? "rankExAequo" : "rank", { rank: value.rank });
  const totals = section.subjects.reduce(
    (sum, s) =>
      s.average === null
        ? sum
        : { coefficients: sum.coefficients + s.coefficient, points: sum.points + s.average * s.coefficient },
    { coefficients: 0, points: 0 },
  );

  if (max === null) {
    return (
      <table className="rc-table">
        <thead>
          <tr>
            <th>{t("subject")}</th>
            <th>{t("level")}</th>
            <th>{t("appreciation")}</th>
          </tr>
        </thead>
        <tbody>
          {section.subjects.map((subject) => (
            <tr key={subject.name}>
              <td className="rc-subject">{subject.name}</td>
              <td>{subject.summary ? t(`levels.${subject.summary}`) : "—"}</td>
              <td className="rc-appreciation">{subject.appreciation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="rc-table">
      <thead>
        <tr>
          <th>{label("subject", t("subject"))}</th>
          <th className="rc-num">{label("coefficient", t("coefficient"))}</th>
          <th className="rc-num">{label("average", t("averageOn", { max }))}</th>
          <th className="rc-num">{label("points", t("points"))}</th>
          <th className="rc-num">{label("rank", t("rankHeader"))}</th>
          <th className="rc-num">{label("classAverage", t("classAverage"))}</th>
          <th>{label("appreciation", t("appreciation"))}</th>
        </tr>
      </thead>
      <tbody>
        {section.subjects.map((subject) => (
          <tr key={subject.name}>
            <td className="rc-subject">
              {arabic && subject.nameAr ? <span className="rc-ar">{subject.nameAr}</span> : subject.name}
            </td>
            <td className="rc-num">{subject.coefficient}</td>
            <td className="rc-num rc-strong">{subject.average === null ? "—" : fr(subject.average)}</td>
            <td className="rc-num">{subject.average === null ? "—" : fr(subject.average * subject.coefficient)}</td>
            <td className="rc-num">{rank(subject.rank)}</td>
            <td className="rc-num">{subject.classAverage === null ? "—" : fr(subject.classAverage)}</td>
            <td className="rc-appreciation">{subject.appreciation}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>{label("total", t("total"))}</td>
          <td className="rc-num">{totals.coefficients || "—"}</td>
          <td className="rc-num">{section.average === null ? "—" : fr(section.average)}</td>
          <td className="rc-num">{totals.coefficients ? fr(totals.points) : "—"}</td>
          <td className="rc-num">{rank(section.rank)}</td>
          <td colSpan={2} />
        </tr>
      </tfoot>
    </table>
  );
}

function Identity({ data, t, arabic }: { data: ReportCardData; t: Translator; arabic: boolean }) {
  const { student } = data;
  const born = student.birthDate
    ? t(student.birthPlace ? "bornAt" : "born", { date: frDate(student.birthDate), place: student.birthPlace ?? "" })
    : null;
  return (
    <dl className="rc-identity">
      <div>
        <dt>{arabic ? AR.student : t("student")}</dt>
        <dd>
          {student.lastName.toUpperCase()} {student.firstName}
        </dd>
      </div>
      <div>
        <dt>{arabic ? AR.matricule : t("matricule")}</dt>
        <dd>{student.matricule}</dd>
      </div>
      <div>
        <dt>{arabic ? AR.class : t("class")}</dt>
        <dd>
          {data.className} · {t("classSize", { count: data.classSize })}
        </dd>
      </div>
      {!arabic && born && (
        <div style={{ gridColumn: "span 3" }}>
          <dt>{t("birth")}</dt>
          <dd style={{ fontWeight: 500 }}>{born}</dd>
        </div>
      )}
    </dl>
  );
}

function Signatures({ data, t, arabic }: { data: ReportCardData; t: Translator; arabic: boolean }) {
  return (
    <div className="rc-signatures rc-small">
      <div>
        {arabic ? AR.teacher : t("homeroomTeacher")}
        {data.homeroomTeacher && (
          <div className="rc-muted" style={{ border: 0, padding: 0, minHeight: 0 }}>
            {data.homeroomTeacher}
          </div>
        )}
      </div>
      <div>{arabic ? AR.director : t("director")}</div>
      <div>{arabic ? AR.parent : t("parent")}</div>
    </div>
  );
}

export function ReportCardDocument({ data, t, code, verifyUrl, qrSvg, logoUrl }: Props) {
  const max = data.scale === "appreciation" ? null : SCALE_MAX[data.scale];
  const [french, arabic] = data.sections;
  const subtitle = `${data.periodLabel} · ${t("year", { year: data.academicYear })}`;
  const sanctionClass = data.sanction === "blame" ? "rc-badge rc-badge-danger" : "rc-badge rc-badge-warn";

  return (
    <>
      <section className="rc-page" lang="fr">
        <Header data={data} logoUrl={logoUrl} title={t("title")} subtitle={subtitle} />
        <Identity data={data} t={t} arabic={false} />
        {french && <SubjectsTable data={data} section={french} t={t} arabic={false} />}

        <div className="rc-summary">
          <div className="rc-box">
            <h2>{t("results")}</h2>
            {max !== null ? (
              <>
                <div className="rc-general">
                  <span>{t("general")}</span>
                  <strong>{data.general === null ? "—" : fr(data.general)}</strong>
                  <span className="rc-muted">/{max}</span>
                  {data.rank && (
                    <span className="rc-strong">
                      {t(data.rank.exAequo ? "rankOfExAequo" : "rankOf", { rank: data.rank.rank, count: data.classSize })}
                    </span>
                  )}
                </div>
                <ul className="rc-lines">
                  {arabic && (
                    <li>
                      {t("sectionAverages", {
                        french: french?.average === null || !french ? "—" : fr(french.average),
                        arabic: arabic.average === null ? "—" : fr(arabic.average),
                      })}
                    </li>
                  )}
                  {data.classStats && (
                    <li className="rc-muted">
                      {t("classStats", {
                        average: fr(data.classStats.average),
                        highest: fr(data.classStats.highest),
                        lowest: fr(data.classStats.lowest),
                      })}
                    </li>
                  )}
                  <li>{t("absences", { absent: data.absences.absent, late: data.absences.late })}</li>
                </ul>
              </>
            ) : (
              <ul className="rc-lines">
                <li>{t("absences", { absent: data.absences.absent, late: data.absences.late })}</li>
              </ul>
            )}
          </div>
          <div className="rc-box">
            <h2>{t("council")}</h2>
            <p style={{ margin: 0, display: "flex", gap: "2mm", flexWrap: "wrap" }}>
              {data.mention && (
                <span className={data.mentionWithheld ? "rc-badge rc-badge-off" : "rc-badge"}>
                  {t(`mentions.${data.mention}`)}
                </span>
              )}
              {data.sanction && <span className={sanctionClass}>{t(`sanctions.${data.sanction}`)}</span>}
              {!data.mention && !data.sanction && <span className="rc-muted">{t("noDecision")}</span>}
            </p>
            {data.mentionWithheld && data.mention && (
              <p className="rc-muted rc-small" style={{ margin: "1mm 0 0" }}>
                {t("mentionWithheld")}
              </p>
            )}
            {data.generalAppreciation && <p style={{ margin: "2mm 0 0", fontStyle: "italic" }}>« {data.generalAppreciation} »</p>}
          </div>
        </div>

        <Signatures data={data} t={t} arabic={false} />
        <Footer t={t} code={code} verifyUrl={verifyUrl} qrSvg={qrSvg} />
      </section>

      {arabic && (
        <section className="rc-page" lang="ar" dir="rtl">
          <Header data={data} logoUrl={logoUrl} title={AR.title} subtitle={`${AR.program} · ${subtitle}`} />
          <Identity data={data} t={t} arabic />
          <SubjectsTable data={data} section={arabic} t={t} arabic />
          <div className="rc-box">
            <div className="rc-general">
              <span>{AR.sectionAverage}</span>
              <strong>{arabic.average === null ? "—" : fr(arabic.average)}</strong>
              <span className="rc-muted">/{max}</span>
              {arabic.rank && (
                <span className="rc-strong">
                  {AR.rank} {arabic.rank.rank} / {data.classSize}
                </span>
              )}
            </div>
          </div>
          <Signatures data={data} t={t} arabic />
          <div dir="ltr">
            <Footer t={t} code={code} verifyUrl={verifyUrl} qrSvg={qrSvg} />
          </div>
        </section>
      )}
    </>
  );
}
