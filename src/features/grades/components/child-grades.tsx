import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { KIND_STYLE } from "../../evaluations/kind-style";
import type { ChildGrade, ChildGrades as ChildGradesData } from "../queries";
import { formatAverage, formatScore } from "../sheet";

const SCALE_MAX = { ten: 10, twenty: 20 } as const;

async function GradeValue({ grade }: { grade: ChildGrade }) {
  const t = await getTranslations("grades");
  if (grade.status === "absent") return <span className="font-semibold text-danger-700">{t("parentAbsent")}</span>;
  if (grade.status === "excused") return <span className="font-medium text-muted-foreground">{t("parentExcused")}</span>;
  if (grade.acquisition) return <span className="font-semibold text-ink">{t(`levels.${grade.acquisition}`)}</span>;
  return (
    <span className="tabular font-semibold text-ink">
      {formatScore(grade.score ?? 0)}
      <span className="font-normal text-muted-foreground">/{grade.maxScore}</span>
    </span>
  );
}

/** Notes publiées d'un enfant sur la période en cours, avec la moyenne provisoire (fiche enfant du parent). */
export async function ChildGrades({ data, firstName }: { data: ChildGradesData | null; firstName: string }) {
  const t = await getTranslations("grades");
  const tKinds = await getTranslations("evaluations.kinds");
  const max = data && data.scale !== "appreciation" ? SCALE_MAX[data.scale] : null;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="child-grades" className="text-lg font-semibold">
          {data ? t("parentTitle", { period: data.periodLabel }) : t("parentTitleNoPeriod")}
        </h2>
        {data?.general != null && max !== null && (
          <p className="tabular text-sm text-ink-soft">
            {t("parentGeneral")} <span className="text-base font-bold text-ink">{formatAverage(data.general)}</span>/{max}
          </p>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("parentHint")}</p>
      {!data || data.subjects.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("parentEmpty", { name: firstName })}</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {await Promise.all(
            data.subjects.map(async (subject) => (
              <li key={subject.id} className="rounded-lg bg-azure-50/40 p-4 ring-1 ring-line/70">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-ink">
                    {subject.name}
                    {max !== null && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {t("parentCoefficient", { value: subject.coefficient })}
                      </span>
                    )}
                  </h3>
                  {subject.average !== null && max !== null && (
                    <p className="tabular shrink-0 text-sm">
                      <span className="sr-only">{t("parentSubjectAverage")} </span>
                      <span className="font-bold text-ink">{formatAverage(subject.average)}</span>
                      <span className="text-muted-foreground">/{max}</span>
                    </p>
                  )}
                  {subject.summary && <p className="shrink-0 text-sm font-semibold text-ink">{t(`levels.${subject.summary}`)}</p>}
                </div>
                <ul className="mt-2 divide-y divide-line/70">
                  {await Promise.all(
                    subject.grades.map(async (grade) => (
                      <li key={grade.evaluationId} className="flex items-center gap-2 py-2 text-sm">
                        <span
                          className={cn(
                            "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            KIND_STYLE[grade.kind],
                          )}
                        >
                          {tKinds(grade.kind)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">{grade.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDate(grade.heldOn, { day: "numeric", month: "short" })}
                          </span>
                        </span>
                        <GradeValue grade={grade} />
                      </li>
                    )),
                  )}
                </ul>
              </li>
            )),
          )}
        </ul>
      )}
    </>
  );
}
