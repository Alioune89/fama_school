import { Lock, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Evaluation, GradebookClass, Period } from "../queries";
import type { EvaluationKind } from "../schemas";
import { EvaluationFormSheet } from "./evaluation-form-sheet";
import { EvaluationRowActions } from "./evaluation-row-actions";

/** Type d'évaluation : libellé toujours écrit, couleur en complément. */
const KIND_STYLE: Record<EvaluationKind, string> = {
  devoir: "bg-azure-50 text-azure-700",
  interrogation: "bg-lavender-50 text-lavender-700",
  composition: "bg-warning-50 text-warning-700",
};

export async function KindBadge({ kind }: { kind: EvaluationKind }) {
  const t = await getTranslations("evaluations.kinds");
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", KIND_STYLE[kind])}>{t(kind)}</span>;
}

/**
 * Évaluations d'une classe sur une période, matière par matière, avec ajout, modification et suppression.
 * Une période verrouillée est en lecture seule.
 */
export async function ClassGradebook({
  klass,
  evaluations,
  periods,
  period,
}: {
  klass: GradebookClass;
  evaluations: Evaluation[];
  periods: Period[];
  period: Period;
}) {
  const t = await getTranslations("evaluations");
  const editable = !period.locked;
  const scaleLabel = klass.scale === "appreciation" ? t("scales.appreciation") : t(`scales.${klass.scale}`);

  return (
    <section aria-labelledby={`class-${klass.id}`} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`class-${klass.id}`} className="text-lg font-semibold">
          {klass.name}
        </h2>
        <span className="text-xs text-muted-foreground">{scaleLabel}</span>
      </div>
      {period.locked && (
        <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-ink-soft">
          <Lock className="size-4 shrink-0" aria-hidden />
          {t("lockedHint", { label: period.label })}
        </p>
      )}
      <ul className="space-y-3">
        {await Promise.all(
          klass.subjects.map(async (subject) => {
            const items = evaluations.filter((e) => e.classId === klass.id && e.subjectId === subject.id);
            const context = `${klass.name} · ${subject.name}`;
            return (
              <li key={subject.id} className="rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">
                    {subject.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {t("coefficient", { value: subject.coefficient })}
                    </span>
                  </h3>
                  {editable && (
                    <EvaluationFormSheet
                      classId={klass.id}
                      subjectId={subject.id}
                      context={context}
                      scale={klass.scale}
                      periods={periods}
                      periodId={period.id}
                      trigger={
                        <Button size="sm" variant="outline" aria-label={t("newFor", { context })}>
                          <Plus aria-hidden />
                          {t("new")}
                        </Button>
                      }
                    />
                  )}
                </div>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("emptySubject")}</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line" aria-label={t("listLabel", { context })}>
                    {await Promise.all(
                      items.map(async (evaluation) => (
                        <li key={evaluation.id} className="flex items-center gap-3 py-2.5">
                          <KindBadge kind={evaluation.kind} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{evaluation.title}</span>
                            <span className="block text-xs text-muted-foreground">
                              {[
                                formatDate(evaluation.heldOn, { weekday: "short", day: "numeric", month: "short" }),
                                evaluation.maxScore !== null && t("onMax", { max: evaluation.maxScore }),
                                evaluation.weight !== 1 && t("coefficient", { value: evaluation.weight }),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          {editable && (
                            <EvaluationRowActions
                              evaluation={evaluation}
                              context={context}
                              scale={klass.scale}
                              periods={periods}
                            />
                          )}
                        </li>
                      )),
                    )}
                  </ul>
                )}
              </li>
            );
          }),
        )}
      </ul>
    </section>
  );
}
