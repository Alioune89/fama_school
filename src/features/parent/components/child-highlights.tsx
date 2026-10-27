import { getTranslations } from "next-intl/server";
import { formatScore } from "@/features/grades/sheet";
import { formatDate, formatXOF } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChildBalance, ChildLastGrade, UpcomingComposition } from "../queries";

async function LastGradeValue({ grade }: { grade: ChildLastGrade }) {
  const t = await getTranslations("grades");
  if (grade.status === "absent") return <>{t("parentAbsent")}</>;
  if (grade.status === "excused") return <>{t("parentExcused")}</>;
  if (grade.acquisition) return <>{t(`levels.${grade.acquisition}`)}</>;
  return (
    <span className="tabular">
      {formatScore(grade.score ?? 0)}/{grade.maxScore === null ? "" : formatScore(grade.maxScore)}
    </span>
  );
}

/** Trois repères d'un enfant sur sa carte d'accueil : dernière note, prochaine composition, reste à payer. */
export async function ChildHighlights({
  lastGrade,
  composition,
  balance,
}: {
  lastGrade: ChildLastGrade | undefined;
  composition: UpcomingComposition | undefined;
  balance: ChildBalance | undefined;
}) {
  const t = await getTranslations("parentHome.highlights");
  const cell = "min-w-0 rounded-lg bg-azure-50/60 px-2.5 py-2 sm:px-3";
  return (
    <dl className="grid grid-cols-3 gap-2 text-sm">
      <div className={cell}>
        <dt className="text-xs leading-tight text-muted-foreground">{t("lastGrade")}</dt>
        <dd className="font-semibold break-words text-ink">{lastGrade ? <LastGradeValue grade={lastGrade} /> : t("noGrade")}</dd>
        {lastGrade && <dd className="text-xs break-words text-ink-soft">{lastGrade.subject}</dd>}
      </div>
      <div className={cell}>
        <dt className="text-xs leading-tight text-muted-foreground">{t("nextComposition")}</dt>
        <dd className="font-semibold break-words text-ink">
          {composition
            ? formatDate(composition.heldOn, { weekday: "short", day: "numeric", month: "short" })
            : t("noComposition")}
        </dd>
        {composition && <dd className="text-xs break-words text-ink-soft">{composition.subject}</dd>}
      </div>
      <div className={cell}>
        <dt className="text-xs leading-tight text-muted-foreground">{t("balance")}</dt>
        <dd className={cn("tabular font-semibold break-words", balance?.overdue ? "text-danger-700" : "text-ink")}>
          {balance ? formatXOF(balance.due) : t("upToDate")}
        </dd>
        {balance && (
          <dd className="text-xs break-words text-ink-soft">
            {balance.overdue ? t("overdue", { amount: formatXOF(balance.overdue) }) : t("notYetDue")}
          </dd>
        )}
      </div>
    </dl>
  );
}
