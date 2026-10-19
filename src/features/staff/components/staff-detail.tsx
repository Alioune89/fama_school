import { ArrowLeft, Mail, Pencil, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getStaffMember } from "../queries";
import { AssignmentsManager } from "./assignments-manager";
import { StaffFormSheet } from "./staff-form-sheet";
import { AccountPill, ContractPill } from "./staff-pills";
import { StaffStatusButton } from "./staff-status-button";

/** Fiche d'un professeur ou d'un membre du personnel (données de requête : sous <Suspense>). */
export async function StaffDetail({ id, kind }: { id: string; kind: "teacher" | "staff" }) {
  const { entry } = await requireSpace("direction");
  const detail = await getStaffMember(entry.schoolId!, id);
  if (!detail || (kind === "teacher") !== (detail.member.role === "teacher")) notFound();
  const { member } = detail;
  const t = await getTranslations("staff");
  const tRoles = await getTranslations("roles");
  const canEditPerson = permissions.inviteRole(entry.roles, member.role);

  return (
    <>
      <Link
        href={kind === "teacher" ? "/direction/professeurs" : "/direction/personnel"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {kind === "teacher" ? t("detail.backTeachers") : t("detail.backStaff")}
      </Link>

      <section className="mt-4 mb-6 flex flex-col gap-5 rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70 sm:flex-row sm:items-center">
        <PersonAvatar name={member.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{member.full_name}</h1>
          <p className="text-sm text-muted-foreground">{member.title ?? tRoles(member.role)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {kind === "staff" && <span className="rounded-full bg-lavender-100 px-2.5 py-1 text-xs font-semibold text-lavender-700">{tRoles(member.role)}</span>}
            <ContractPill contract={member.contract} />
            <AccountPill linked={Boolean(member.user_id)} status={member.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
            {member.phone && (
              <a href={`tel:${member.phone}`} className="tabular inline-flex items-center gap-1.5 hover:text-ink">
                <Phone className="size-4" aria-hidden />
                {formatPhone(member.phone)}
              </a>
            )}
            {member.email && (
              <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Mail className="size-4" aria-hidden />
                {member.email}
              </a>
            )}
          </div>
          {!member.user_id && member.status === "active" && (
            <p className="mt-3 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">{t("detail.invitedHint")}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("detail.since", { date: formatDate(member.created_at) })}</p>
        </div>
        {canEditPerson && (
          <div className="flex flex-wrap gap-2">
            <StaffFormSheet
              kind={kind}
              member={{
                id: member.id,
                fullName: member.full_name,
                phone: member.phone,
                email: member.email,
                title: member.title,
                contract: member.contract,
              }}
              trigger={
                <Button variant="outline">
                  <Pencil aria-hidden />
                  {t("detail.edit")}
                </Button>
              }
            />
            <StaffStatusButton id={member.id} name={member.full_name} status={member.status} />
          </div>
        )}
      </section>

      {kind === "teacher" && (
        <>
          {detail.yearLabel && <p className="mb-3 text-sm font-semibold text-ink-soft">{t("assignments.year", { year: detail.yearLabel })}</p>}
          <AssignmentsManager
            staffId={member.id}
            assignments={detail.assignments}
            homeroomClasses={detail.homeroomClasses}
            options={detail.options}
            canEdit={permissions.manageAcademics(entry.roles) && member.status === "active"}
          />
        </>
      )}
    </>
  );
}

export function StaffDetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-4 w-40 animate-pulse rounded-full bg-line" />
      <div className="h-40 animate-pulse rounded-xl bg-white shadow-card" />
      <div className="h-64 animate-pulse rounded-xl bg-white shadow-card" />
    </div>
  );
}
