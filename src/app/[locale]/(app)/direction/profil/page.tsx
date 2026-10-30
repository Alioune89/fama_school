import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { StaffProfile } from "@/features/profile/components/staff-profile";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("profile") };
}

async function Profile() {
  const { user } = await requireSpace("direction");
  return <StaffProfile user={user} teacher={false} />;
}

export default async function DirectionProfilePage() {
  const [t, tNav] = await Promise.all([getTranslations("profile"), getTranslations("nav")]);
  return (
    <>
      <PageHeader title={tNav("profile")} description={t("hint")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Profile />
      </Suspense>
    </>
  );
}
