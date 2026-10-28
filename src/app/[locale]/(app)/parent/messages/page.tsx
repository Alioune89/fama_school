import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import { ParentNewConversation } from "@/features/messaging/components/parent-new-conversation";
import { listConversations, listTeacherContacts } from "@/features/messaging/queries";
import { listMyChildren } from "@/features/parent/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("messages") };
}

/** Messages du parent : conversations avec les professeurs de ses enfants et la direction. */
async function Messages() {
  const { user } = await requireSpace("parent");
  const [children, conversations, t] = await Promise.all([
    listMyChildren(user.id),
    listConversations("parent", user.id),
    getTranslations("messages"),
  ]);
  const childrenOptions = await Promise.all(
    children.map(async (child) => ({
      id: child.id,
      name: `${child.firstName} ${child.lastName}`,
      teachers: await listTeacherContacts(child.id),
    })),
  );
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("descriptionParent")}
        actions={childrenOptions.length > 0 && <ParentNewConversation childrenOptions={childrenOptions} />}
      />
      <ConversationList conversations={conversations} basePath="/parent/messages" today={todayInDakar()} />
    </>
  );
}

export default function ParentMessagesPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Messages />
    </Suspense>
  );
}
