import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ThreadHeader } from "@/features/messaging/components/thread-header";
import { ThreadView } from "@/features/messaging/components/thread-view";
import { getAvailabilities, getThread } from "@/features/messaging/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("messages") };
}

async function Conversation({ params }: { params: PageProps<"/[locale]/parent/messages/[id]">["params"] }) {
  const [{ id }, { user }, t] = await Promise.all([params, requireSpace("parent"), getTranslations("messages")]);
  const thread = /^[0-9a-f-]{36}$/.test(id) ? await getThread(id, user.id) : null;
  if (!thread) notFound();
  const availability =
    thread.teacherId && thread.parentId === user.id
      ? ((await getAvailabilities([thread.teacherId])).get(thread.teacherId) ?? null)
      : null;
  return (
    <div className="mx-auto max-w-3xl">
      <ThreadHeader
        subject={thread.subject}
        counterpart={thread.counterpart ?? t("direction")}
        studentName={thread.studentName}
        availability={availability}
      />
      <ThreadView conversationId={thread.id} messages={thread.messages} />
    </div>
  );
}

export default async function ParentConversationPage({ params }: PageProps<"/[locale]/parent/messages/[id]">) {
  const t = await getTranslations("messages");
  return (
    <>
      <Link
        href="/parent/messages"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Conversation params={params} />
      </Suspense>
    </>
  );
}
