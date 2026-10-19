import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronRight, Plus, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SearchInput } from "@/components/data/search-input";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import { StaffFormSheet } from "@/features/staff/components/staff-form-sheet";
import { AccountPill } from "@/features/staff/components/staff-pills";
import { listStaff } from "@/features/staff/queries";
import { STAFF_DIRECTORY_ROLES } from "@/features/staff/schemas";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("staff") };
}

async function AddStaffButton() {
  const { entry } = await requireSpace("direction");
  const roleOptions = STAFF_DIRECTORY_ROLES.filter((role) => permissions.inviteRole(entry.roles, role));
  if (roleOptions.length === 0) return null;
  const t = await getTranslations("staff");
  return (
    <StaffFormSheet
      kind="staff"
      roleOptions={roleOptions}
      trigger={
        <Button variant="sun">
          <Plus aria-hidden />
          {t("form.addStaff")}
        </Button>
      }
    />
  );
}

async function StaffList({ searchParams }: { searchParams: PageProps<"/[locale]/direction/personnel">["searchParams"] }) {
  const { entry } = await requireSpace("direction");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const [staff, t, tRoles] = await Promise.all([listStaff(entry.schoolId!, { q }), getTranslations("staff"), getTranslations("roles")]);

  if (staff.length === 0) return <EmptyState icon={UsersRound} title={q ? t("list.noResults") : t("list.emptyStaff")} />;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {staff.map((member) => (
        <li key={member.id}>
          <Link
            href={`/direction/personnel/${member.id}`}
            className="flex h-full items-start gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 transition-colors hover:bg-azure-50/60"
          >
            <PersonAvatar name={member.full_name} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{member.full_name}</span>
              <span className="block text-sm text-muted-foreground">{member.title ?? tRoles(member.role)}</span>
              <span className="tabular mt-1 block text-xs text-ink-soft">{formatPhone(member.phone) || member.email}</span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-lavender-100 px-2.5 py-1 text-xs font-semibold text-lavender-700">{tRoles(member.role)}</span>
                <AccountPill linked={Boolean(member.user_id)} status={member.status} />
              </span>
            </span>
            <ChevronRight className="mt-1 size-4 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function StaffPage({ searchParams }: PageProps<"/[locale]/direction/personnel">) {
  const t = await getTranslations("staff");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader
        title={tNav("staff")}
        description={t("list.staffHint")}
        actions={
          <Suspense fallback={null}>
            <AddStaffButton />
          </Suspense>
        }
      />
      <div className="mb-5">
        <Suspense fallback={<div className="h-11 w-72 rounded-full bg-white shadow-card" aria-hidden />}>
          <SearchInput placeholder={t("list.searchStaff")} label={t("list.search")} />
        </Suspense>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <StaffList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
