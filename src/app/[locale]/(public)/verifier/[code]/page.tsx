import { Suspense } from "react";
import type { Metadata } from "next";
import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { formatAverage } from "@/features/grades/sheet";
import { verifyReportCard } from "@/features/verification/queries";
import { formatDate, formatXOF } from "@/lib/format";
import { VerifyForm } from "../verify-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("verify");
  return { title: t("title"), robots: { index: false } };
}

const SCALE_MAX = { ten: 10, twenty: 20 } as const;

/** Résultat de la vérification d'un code : bulletin ou reçu authentique, code inconnu, ou trop d'essais. */
async function Result({ params }: { params: PageProps<"/[locale]/verifier/[code]">["params"] }) {
  const [{ code }, t, tCards] = await Promise.all([params, getTranslations("verify"), getTranslations("reportCards")]);
  const display = decodeURIComponent(code).slice(0, 20);
  const result = await verifyReportCard(display);

  if (result.status === "tooManyAttempts") {
    return (
      <section className="space-y-3 rounded-2xl bg-warning-50 p-6 ring-1 ring-warning-500/30" role="status">
        <Clock className="size-8 text-warning-700" aria-hidden />
        <h1 className="text-xl font-bold">{t("tooManyTitle")}</h1>
        <p className="text-sm text-ink-soft">{t("tooManyBody")}</p>
      </section>
    );
  }

  if (result.status === "notFound") {
    return (
      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-danger-500/40" role="status">
        <CircleAlert className="size-8 text-danger-500" aria-hidden />
        <h1 className="text-xl font-bold">{t("notFoundTitle")}</h1>
        <p className="text-sm text-ink-soft">{t("notFoundBody", { code: display })}</p>
        <VerifyForm defaultValue={display} />
      </section>
    );
  }

  if (result.kind === "receipt") {
    const tReceipts = await getTranslations("receipts");
    const receiptRows: [string, string][] = [
      [t("receiptNumber"), result.number],
      [t("student"), `${result.student.firstName} ${result.student.lastName.toUpperCase()}`],
      [t("matricule"), result.student.matricule],
      [t("school"), result.school],
      [t("receivedOn"), formatDate(result.receivedOn, { day: "numeric", month: "long", year: "numeric" })],
      [t("amount"), formatXOF(result.amount)],
      [t("method"), tReceipts(`methods.${result.method}`)],
    ];
    return (
      <section
        className={`space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ${result.cancelled ? "ring-danger-500/40" : "ring-success-500/40"}`}
        role="status"
      >
        {result.cancelled ? (
          <CircleAlert className="size-8 text-danger-500" aria-hidden />
        ) : (
          <CircleCheck className="size-8 text-success-500" aria-hidden />
        )}
        <h1 className="text-xl font-bold">{t(result.cancelled ? "receiptCancelledTitle" : "receiptValidTitle")}</h1>
        <p className="text-sm text-ink-soft">{t(result.cancelled ? "receiptCancelledBody" : "receiptValidBody")}</p>
        <dl className="divide-y divide-line rounded-xl bg-success-50/40 px-4 ring-1 ring-line/70">
          {receiptRows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">{t("code", { code: result.code })}</p>
      </section>
    );
  }

  const max = result.scale === "appreciation" ? null : SCALE_MAX[result.scale];
  const rows: [string, string][] = [
    [t("student"), `${result.student.firstName} ${result.student.lastName.toUpperCase()}`],
    [t("matricule"), result.student.matricule],
    [t("school"), result.school],
    [t("class"), result.className],
    [t("period"), `${result.periodLabel} · ${result.academicYear}`],
  ];
  if (max !== null && result.general !== null) rows.push([t("general"), `${formatAverage(result.general)} / ${max}`]);
  if (result.rank) {
    rows.push([
      t("rank"),
      tCards(result.rank.exAequo ? "rankOfExAequo" : "rankOf", { rank: result.rank.rank, count: result.classSize }).replace(
        /^Rang : /,
        "",
      ),
    ]);
  }
  if (result.mention) rows.push([t("mention"), tCards(`mentions.${result.mention}`)]);
  rows.push([t("generatedAt"), formatDate(result.generatedAt, { day: "numeric", month: "long", year: "numeric" })]);

  return (
    <section className="space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-success-500/40" role="status">
      <CircleCheck className="size-8 text-success-500" aria-hidden />
      <h1 className="text-xl font-bold">{t("validTitle")}</h1>
      <p className="text-sm text-ink-soft">{t("validBody")}</p>
      <dl className="divide-y divide-line rounded-xl bg-success-50/40 px-4 ring-1 ring-line/70">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{t("code", { code: result.code })}</p>
    </section>
  );
}

export default function VerifyCodePage({ params }: PageProps<"/[locale]/verifier/[code]">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-4 py-10">
      <Logo />
      <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-white shadow-card" aria-hidden />}>
        <Result params={params} />
      </Suspense>
    </main>
  );
}
