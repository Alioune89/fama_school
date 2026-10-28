import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import { StaffNewConversation } from "@/features/messaging/components/staff-new-conversation";
import { listConversations, listStudentOptions } from "@/features/messaging/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("messages") };
}

/** Boîte « Direction » : conversations des parents avec la direction (partagée entre fondateur, directeur, vie scolaire, secrétariat). */
async function Messages() {
  const { user, entry } = await requireSpace("direction");
  const schoolId = entry.schoolId!;
  const [conversations, students, t] = await Promise.all([
    listConversations("direction", user.id, schoolId),
    listStudentOptions(schoolId),
    getTranslations("messages"),
  ]);
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("descriptionDirection")}
        actions={<StaffNewConversation students={students} teacherId={null} basePath="/direction/messages" />}
      />
      <ConversationList conversations={conversations} basePath="/direction/messages" today={todayInDakar()} />
    </>
  );
}

export default function DirectionMessagesPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Messages />
    </Suspense>
  );
}
