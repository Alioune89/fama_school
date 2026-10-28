import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { AvailabilityForm } from "@/features/messaging/components/availability-form";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import { StaffNewConversation } from "@/features/messaging/components/staff-new-conversation";
import { getAvailabilities, listConversations, listStudentOptions } from "@/features/messaging/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("messages") };
}

/** Messages du professeur : conversations avec les parents de ses élèves, et ses horaires de réponse. */
async function Messages() {
  const { user, entry } = await requireSpace("professeur");
  const [conversations, students, availabilities, t] = await Promise.all([
    listConversations("teacher", user.id),
    listStudentOptions(entry.schoolId!),
    getAvailabilities([user.id]),
    getTranslations("messages"),
  ]);
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("descriptionTeacher")}
        actions={<StaffNewConversation students={students} teacherId={user.id} basePath="/professeur/messages" />}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ConversationList conversations={conversations} basePath="/professeur/messages" today={todayInDakar()} />
        <AvailabilityForm initial={availabilities.get(user.id)!} />
      </div>
    </>
  );
}

export default function TeacherMessagesPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Messages />
    </Suspense>
  );
}
