import { MessagesSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Link } from "@/i18n/navigation";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "../queries";

/** Conversations : interlocuteur, enfant concerné, sujet, dernier message ; pastille si non lue. */
export async function ConversationList({
  conversations,
  basePath,
  today,
}: {
  conversations: ConversationSummary[];
  basePath: string;
  today: string;
}) {
  const t = await getTranslations("messages");
  if (conversations.length === 0) return <EmptyState icon={MessagesSquare} title={t("empty")} body={t("emptyHint")} />;
  return (
    <ul
      className="divide-y divide-line overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-line/70"
      aria-label={t("listLabel")}
    >
      {conversations.map((conversation) => {
        const name = conversation.counterpart ?? t("direction");
        return (
          <li key={conversation.id}>
            <Link
              href={`${basePath}/${conversation.id}`}
              className={cn(
                "flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 sm:px-5",
                conversation.unread && "bg-azure-50/60",
              )}
            >
              <PersonAvatar name={name} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn("truncate text-sm text-ink", conversation.unread ? "font-bold" : "font-semibold")}>
                    {name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {conversation.lastAt.slice(0, 10) === today
                      ? formatTime(conversation.lastAt)
                      : formatDate(conversation.lastAt, { day: "numeric", month: "short" })}
                  </span>
                </span>
                <span className="block truncate text-xs text-ink-soft">
                  {t("about", { child: conversation.studentName, subject: conversation.subject })}
                </span>
                <span
                  className={cn(
                    "mt-0.5 flex items-center gap-2 text-sm",
                    conversation.unread ? "text-ink" : "text-muted-foreground",
                  )}
                >
                  {conversation.unread && <span className="size-2 shrink-0 rounded-full bg-azure-600" aria-label={t("unread")} />}
                  <span className="truncate">
                    {conversation.lastFromMe ? t("you", { body: conversation.lastBody }) : conversation.lastBody}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
