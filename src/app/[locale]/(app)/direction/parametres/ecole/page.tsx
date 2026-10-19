import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StepHeader, StepSkeleton, nextStepHref } from "@/features/setup/components/step-header";
import { getSetupData } from "@/features/setup/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SchoolIdentityForm } from "./school-identity-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("setup.steps.school");
  return { title: t("title") };
}

async function SchoolStep() {
  const { entry } = await requireSpace("direction");
  const { school } = await getSetupData(entry.schoolId!);
  const supabase = await createClient();
  const logoUrl = school.logo_path ? supabase.storage.from("school-logos").getPublicUrl(school.logo_path).data.publicUrl : null;

  return (
    <SchoolIdentityForm
      canEdit={permissions.manageSchool(entry.roles)}
      nextHref={nextStepHref("school")}
      logoUrl={logoUrl}
      defaults={{
        name: school.name,
        shortName: school.short_name ?? "",
        city: school.city ?? "",
        region: school.region ?? "",
        address: school.address ?? "",
        phone: school.phone ?? "",
        email: school.email ?? "",
      }}
    />
  );
}

export default function SchoolStepPage() {
  return (
    <>
      <StepHeader step="school" />
      <Suspense fallback={<StepSkeleton />}>
        <SchoolStep />
      </Suspense>
    </>
  );
}
