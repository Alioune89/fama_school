import { FileText, Image as ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatDate, formatTime } from "@/lib/format";
import type { Justification } from "../queries";
import { formatPeriod, JustificationStatusPill } from "./justification-status";
import { PhotoViewer } from "./photo-viewer";
import { WithdrawButton } from "./withdraw-button";

const linkClass = "inline-flex items-center gap-1.5 text-sm font-semibold text-azure-700 underline-offset-2 hover:underline";

/** Photo ouverte par-dessus la page ; PDF dans un nouvel onglet (lien temporaire). */
export async function JustificationFile({ url, mimeType }: { url: string; mimeType: string | null }) {
  const t = await getTranslations("justifications");
  if (mimeType === "application/pdf") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={linkClass}>
        <FileText className="size-4" aria-hidden />
        {t("viewFile")}
      </a>
    );
  }
  return (
    <PhotoViewer url={url} title={t("viewPhoto")} className={linkClass}>
      <ImageIcon className="size-4" aria-hidden />
      {t("viewPhoto")}
    </PhotoViewer>
  );
}

/**
 * Justificatifs d'un élève : période, motif, décision de l'école et sa remarque.
 * `userId` permet au parent qui l'a envoyé de retirer un justificatif encore en attente.
 */
export async function JustificationList({
  justifications,
  userId,
  emptyLabel,
}: {
  justifications: (Justification & { fileUrl: string | null })[];
  userId?: string;
  emptyLabel: string;
}) {
  const t = await getTranslations("justifications");
  if (justifications.length === 0) return <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>;

  return (
    <ul className="mt-3 divide-y divide-line" aria-label={t("listLabel")}>
      {await Promise.all(
        justifications.map(async (j) => (
          <li key={j.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <JustificationStatusPill status={j.status} />
              <span className="text-sm font-semibold text-ink first-letter:uppercase">{await formatPeriod(j.from, j.to)}</span>
            </div>
            <p className="text-sm text-ink">
              <span className="font-medium">{t(`reasons.${j.reason}`)}</span>
              {j.comment && <span className="whitespace-pre-line text-ink-soft"> · {j.comment}</span>}
            </p>
            {j.fileUrl && <JustificationFile url={j.fileUrl} mimeType={j.mimeType} />}
            {j.reviewNote && (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-ink">{t("reviewNote", { note: j.reviewNote })}</p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {j.reviewedAt && j.reviewedByName
                  ? t("reviewedBy", {
                      status: t(`statuses.${j.status}`),
                      name: j.reviewedByName,
                      date: formatDate(j.reviewedAt, { day: "numeric", month: "long" }),
                    })
                  : t("sentBy", {
                      name: j.submittedByName,
                      date: formatDate(j.createdAt, { day: "numeric", month: "long" }),
                      time: formatTime(j.createdAt),
                    })}
              </p>
              {userId && j.status === "pending" && j.submittedBy === userId && <WithdrawButton id={j.id} />}
            </div>
          </li>
        )),
      )}
    </ul>
  );
}
