import { FileText, ImageOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { Link } from "@/i18n/navigation";
import { formatDate, formatTime } from "@/lib/format";
import type { ReviewFilter, ReviewItem } from "../queries";
import { formatPeriod, JustificationStatusPill } from "./justification-status";
import { PhotoViewer } from "./photo-viewer";
import { ReviewActions } from "./review-actions";

/** Vignette de la photo (ouverte par-dessus la page), ou icône du PDF (nouvel onglet). */
async function Proof({ item }: { item: ReviewItem }) {
  const t = await getTranslations("justifications");
  const box = "grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-azure-50 ring-1 ring-line sm:size-28";
  if (!item.fileUrl) {
    return (
      <span className={`${box} text-ink-soft`} title={t("review.noPhoto")}>
        <ImageOff className="size-6" aria-hidden />
        <span className="sr-only">{t("review.noPhoto")}</span>
      </span>
    );
  }
  if (item.mimeType === "application/pdf") {
    return (
      <a href={item.fileUrl} target="_blank" rel="noreferrer" className={`${box} hover:ring-azure-500`}>
        <FileText className="size-8 text-azure-700" aria-hidden />
        <span className="sr-only">{t("viewFile")}</span>
      </a>
    );
  }
  const title = t("photoOf", { name: item.studentName });
  return (
    <PhotoViewer url={item.fileUrl} title={title} className={`${box} hover:ring-azure-500`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- lien temporaire du stockage privé */}
      <img src={item.fileUrl} alt={title} className="size-full object-cover" />
    </PhotoViewer>
  );
}

/** Justificatifs envoyés par les parents, à accepter ou refuser. */
export async function ReviewList({
  items,
  filter,
  canReview,
}: {
  items: ReviewItem[];
  filter: ReviewFilter;
  canReview: boolean;
}) {
  const t = await getTranslations("justifications");
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={filter === "pending" ? t("review.empty") : t("review.emptyReviewed")}
        body={t("review.hint")}
      />
    );
  }

  return (
    <ul className="space-y-4" aria-label={t("listLabel")}>
      {await Promise.all(
        items.map(async (item) => (
          <li key={item.id} className="flex gap-4 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5">
            <Proof item={item} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <JustificationStatusPill status={item.status} />
                <Link href={`/direction/eleves/${item.studentId}`} className="font-semibold text-ink hover:underline">
                  {item.studentName}
                </Link>
                {item.className && <span className="text-sm text-ink-soft">{item.className}</span>}
              </div>
              <p className="text-sm font-medium text-ink first-letter:uppercase">{await formatPeriod(item.from, item.to)}</p>
              <p className="text-xs text-muted-foreground">{t("review.absences", { count: item.absences })}</p>
              <p className="text-sm text-ink">
                <span className="font-medium">{t(`reasons.${item.reason}`)}</span>
                {item.comment && <span className="whitespace-pre-line text-ink-soft"> · {item.comment}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("sentBy", {
                  name: item.submittedByName,
                  date: formatDate(item.createdAt, { day: "numeric", month: "long" }),
                  time: formatTime(item.createdAt),
                })}
              </p>
              {item.reviewedAt && item.reviewedByName && (
                <p className="text-xs text-muted-foreground">
                  {t("reviewedBy", {
                    status: t(`statuses.${item.status}`),
                    name: item.reviewedByName,
                    date: formatDate(item.reviewedAt, { day: "numeric", month: "long" }),
                  })}
                </p>
              )}
              {item.reviewNote && (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-ink">{t("reviewNote", { note: item.reviewNote })}</p>
              )}
              {canReview && (
                <div className="pt-1.5">
                  <ReviewActions id={item.id} status={item.status} />
                </div>
              )}
            </div>
          </li>
        )),
      )}
    </ul>
  );
}
