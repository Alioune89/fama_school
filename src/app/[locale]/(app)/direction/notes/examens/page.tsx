import { Suspense } from "react";
import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PrintButton } from "@/features/arrivals/components/print-button";
import { GradesTabs } from "@/features/evaluations/components/grades-tabs";
import { ExamBoard } from "@/features/exams/components/exam-board";
import { listExamCandidates, listSchoolExams } from "@/features/exams/queries";
import type { Exam } from "@/features/exams/schemas";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("exams");
  return { title: t("title") };
}

type SearchParams = PageProps<"/[locale]/direction/notes/examens">["searchParams"];

async function Candidates({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }] = await Promise.all([searchParams, requireSpace("direction")]);
  const schoolId = entry.schoolId!;
  const [exams, t] = await Promise.all([listSchoolExams(schoolId), getTranslations("exams")]);
  if (exams.length === 0) return <EmptyState icon={GraduationCap} title={t("none")} body={t("noneHint")} />;
  const exam: Exam = exams.find((candidate) => candidate === params.examen) ?? exams.at(-1)!;
  const supabase = await createClient();
  const [{ yearLabel, rows }, { data: school }] = await Promise.all([
    listExamCandidates(schoolId, exam),
    supabase.from("schools").select("name").eq("id", schoolId).single(),
  ]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <nav aria-label={t("examsLabel")} className="flex gap-2">
          {exams.map((value) => (
            <Link
              key={value}
              href={`/direction/notes/examens?examen=${value}`}
              aria-current={value === exam ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-line",
                value === exam ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft hover:text-ink",
              )}
            >
              {value}
            </Link>
          ))}
        </nav>
        {rows.length > 0 && <PrintButton />}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title={t("noCandidates", { exam })} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground print:hidden">
            {t("count", { count: rows.length, exam, year: yearLabel ?? "" })}
          </p>
          <div className="print:hidden">
            <ExamBoard key={exam} exam={exam} rows={rows} canEdit={permissions.manageExams(entry.roles)} />
          </div>

          {/* Liste imprimée : valeurs enregistrées seulement. */}
          <section className="hidden text-black print:block">
            <h1 className="text-lg font-bold">{t("printTitle", { exam, year: yearLabel ?? "" })}</h1>
            <p className="mb-3 text-sm">{school?.name}</p>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">{t("student")}</th>
                  <th className="py-1 pr-2">{t("birth")}</th>
                  <th className="py-1 pr-2">{t("class")}</th>
                  <th className="py-1 pr-2">{t("tableNumber")}</th>
                  <th className="py-1 pr-2">{t("center")}</th>
                  <th className="py-1">{t("result")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.studentId} className="break-inside-avoid border-b border-black/30">
                    <td className="py-1 pr-2 tabular-nums">{index + 1}</td>
                    <td className="py-1 pr-2 font-medium">
                      {row.lastName} {row.firstName}
                    </td>
                    <td className="py-1 pr-2">
                      {[row.birthDate ? formatDate(row.birthDate) : null, row.birthPlace].filter(Boolean).join(" · ")}
                    </td>
                    <td className="py-1 pr-2">{row.className}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.tableNumber}</td>
                    <td className="py-1 pr-2">{row.center}</td>
                    <td className="py-1">
                      {row.result === "pending"
                        ? ""
                        : [t(`results.${row.result}`), row.mention ? t(`mentions.${row.mention}`) : null]
                            .filter(Boolean)
                            .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}

export default async function ExamsPage({ searchParams }: PageProps<"/[locale]/direction/notes/examens">) {
  const [t, tNav] = await Promise.all([getTranslations("exams"), getTranslations("nav")]);
  return (
    <>
      <div className="print:hidden">
        <PageHeader title={tNav("grades")} description={t("hint")} />
        <GradesTabs active="exams" />
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Candidates searchParams={searchParams} />
      </Suspense>
    </>
  );
}
