import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { ConsentForm } from "@/features/consents/components/consent-form";
import { getMyConsents } from "@/features/consents/queries";
import { requireSpace } from "@/lib/auth/session";
import { formatPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("profile") };
}

/** Profil du parent : identité, langue et consentements (modifiables à tout moment). */
async function Profile() {
  const { user } = await requireSpace("parent");
  const { consents } = await getMyConsents(user.id);
  const name = user.fullName ?? formatPhone(user.phone ?? "");
  return (
    <div className="max-w-xl space-y-6">
      <section className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
        <PersonAvatar name={name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{name}</p>
          {user.phone && <p className="text-sm text-muted-foreground">{formatPhone(user.phone)}</p>}
        </div>
      </section>
      <ConsentForm initial={consents} mode="profile" />
    </div>
  );
}

export default async function ParentProfilePage() {
  const t = await getTranslations("nav");
  return (
    <>
      <PageHeader title={t("profile")} />
      <Suspense fallback={<div className="h-96 max-w-xl animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Profile />
      </Suspense>
    </>
  );
}
