import { Megaphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate } from "@/lib/format";
import type { Announcement } from "../queries";
import { DeleteAnnouncementButton } from "./delete-announcement-button";

/** Annonces, des plus récentes aux plus anciennes ; la direction voit les destinataires et peut supprimer. */
export async function AnnouncementList({ announcements, manage = false }: { announcements: Announcement[]; manage?: boolean }) {
  const t = await getTranslations("announcements");
  if (announcements.length === 0) {
    return <EmptyState icon={Megaphone} title={t("empty")} body={t(manage ? "emptyHintManage" : "emptyHint")} />;
  }
  return (
    <ul className="space-y-4" aria-label={t("listLabel")}>
      {announcements.map((item) => (
        <li key={item.id}>
          <article
            className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6"
            aria-labelledby={`announcement-${item.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 id={`announcement-${item.id}`} className="text-lg font-semibold text-ink">
                  {item.title}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("byline", {
                    author: item.publishedByName,
                    date: formatDate(item.publishedAt, { weekday: "long", day: "numeric", month: "long" }),
                  })}
                </p>
              </div>
              {manage && <DeleteAnnouncementButton id={item.id} title={item.title} />}
            </div>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink">{item.body}</p>
            {manage && (
              <p className="mt-3 text-xs font-medium text-ink-soft">
                {item.audience === "classes"
                  ? t("sentToClasses", { classes: item.classNames.join(", "), count: item.recipientCount })
                  : t("sentTo", { audience: t(`audiences.${item.audience}`), count: item.recipientCount })}
              </p>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
