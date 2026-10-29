import { getTranslations } from "next-intl/server";
import { summarizeProgress } from "@/lib/domain/programme";
import { getClassProgress, listClassProgrammes } from "../queries";
import { ProgressSummary } from "./progress-summary";

/** Fiche enfant du parent : avancement de la classe dans le programme de chaque matière. */
export async function ChildProgramme({ classId, today }: { classId: string | null; today: string }) {
  const t = await getTranslations("programme");
  const [programmes, progress] = classId
    ? await Promise.all([listClassProgrammes(classId), getClassProgress(classId)])
    : [null, new Map()];
  return (
    <>
      <h2 id="child-programme" className="text-lg font-semibold">
        {t("childTitle")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("childHint")}</p>
      {!programmes || programmes.programmes.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("childEmpty")}</p>
      ) : (
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {programmes.programmes.map((programme) => (
            <li key={programme.subjectId}>
              <p className="mb-1 text-sm font-semibold text-ink">{programme.subjectName}</p>
              <ProgressSummary summary={summarizeProgress(programme.chapters, progress, today)} compact />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
