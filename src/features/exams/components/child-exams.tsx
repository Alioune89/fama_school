import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusPill, type StatusTone } from "@/components/dashboard/status-pill";
import type { listStudentExams } from "../queries";
import type { ExamResult } from "../schemas";

const TONES: Record<ExamResult, StatusTone> = {
  pending: "neutral",
  admitted: "success",
  admitted_second_round: "success",
  second_round: "warning",
  failed: "danger",
  absent: "neutral",
};

/** Examens de l'enfant chez le parent : convocation (numéro de table, centre), puis résultat. */
export async function ChildExams({ exams }: { exams: Awaited<ReturnType<typeof listStudentExams>> }) {
  const t = await getTranslations("exams");
  return (
    <>
      <h2 id="child-exams" className="text-lg font-semibold">
        {t("childTitle")}
      </h2>
      <ul className="mt-3 grid gap-2">
        {exams.map((exam) => (
          <li key={exam.id} className="flex items-start gap-3 rounded-lg bg-azure-50/60 px-4 py-3 ring-1 ring-line/70">
            <GraduationCap className="mt-0.5 size-5 shrink-0 text-azure-700" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                {exam.exam} {exam.yearLabel}
                {exam.result !== "pending" && (
                  <StatusPill tone={TONES[exam.result]}>
                    {[t(`results.${exam.result}`), exam.mention ? t(`mentions.${exam.mention}`) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </StatusPill>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {exam.tableNumber || exam.center
                  ? [exam.tableNumber && t("tableNumberValue", { value: exam.tableNumber }), exam.center]
                      .filter(Boolean)
                      .join(" · ")
                  : t("convocationPending")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
