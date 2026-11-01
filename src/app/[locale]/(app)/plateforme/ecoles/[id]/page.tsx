import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft, Check, Circle, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { daysSince, HEALTH_TONE, schoolHealth } from "@/features/platform/health";
import { getSchoolDetail } from "@/features/platform/queries";
import { SETUP_STEPS } from "@/features/setup/steps";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { formatDate, formatInteger } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { SCHOOL_STATUS_TONES } from "@/features/platform/components/status-tones";

type Props = PageProps<"/[locale]/plateforme/ecoles/[id]">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform");
  return { title: t("schoolsTitle") };
}

const whatsapp = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}

function ContactButtons({ phone, label }: { phone: string; label: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${phone}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Phone aria-hidden />
        {label}
      </a>
      <a href={whatsapp(phone)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
        <WhatsAppIcon className="size-4" />
        WhatsApp
      </a>
    </div>
  );
}

async function Detail({ params }: { params: Props["params"] }) {
  const { id } = await params;
  await requireSpace("plateforme");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const detail = await getSchoolDetail(id);
  if (!detail) notFound();
  const [t, tRoles, tSteps] = await Promise.all([
    getTranslations("platform"),
    getTranslations("roles"),
    getTranslations("setup.steps"),
  ]);
  const { school, team, invitations, setup, activity } = detail;
  const now = new Date();
  const health = schoolHealth({ activeStudents: activity.activeStudents, lastActivity: activity.lastActivity, now });
  const days = daysSince(activity.lastActivity, now);
  const direction = team.filter((member) => member.roles.some((role) => role === "owner" || role === "director"));

  return (
    <>
      <Link href="/plateforme" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {t("school.back")}
      </Link>
      <PageHeader
        title={school.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill tone={SCHOOL_STATUS_TONES[school.status]}>{t(`statuses.${school.status}`)}</StatusPill>
            <span>{t(`plans.${school.plan}`)}</span>
            {school.city && <span>· {school.city}</span>}
            <span>· {t("school.since", { date: formatDate(school.created_at) })}</span>
          </span>
        }
        actions={
          <Link href="/plateforme/formules" className={buttonVariants({ variant: "outline" })}>
            {t("school.changePlan")}
          </Link>
        }
      />

      <section
        aria-label={t("columns.activity")}
        className={cn(
          "mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 text-sm ring-1",
          health === "active" && "bg-success-50 ring-success-500/30",
          health === "slowing" && "bg-warning-50 ring-warning-500/30",
          health === "inactive" && "bg-danger-50 ring-danger-500/30",
          health === "setup" && "bg-azure-50 ring-azure-200",
        )}
      >
        <StatusPill tone={HEALTH_TONE[health]} className="bg-white">
          {t(`health.${health}`)}
        </StatusPill>
        <span className="font-medium text-ink">{t(`school.advice.${health}`)}</span>
        <span className="text-ink-soft">{days === null ? t("school.noActivity") : t("school.lastActivity", { days })}</span>
      </section>

      <section aria-labelledby="activity" className="mb-5">
        <h2 id="activity" className="font-semibold">
          {t("school.activityTitle", { days: activity.windowDays })}
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("school.activityHint")}</p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <KpiCard label={t("school.students")} value={activity.activeStudents} tone="azure" />
          <KpiCard label={t("school.rollCalls")} value={activity.rollCalls} tone="lavender" />
          <KpiCard label={t("school.grades")} value={activity.grades} tone="sun" />
          <KpiCard label={t("school.payments")} value={activity.payments} tone="white" />
          <KpiCard
            label={t("school.parents")}
            value={t("school.parentsValue", {
              connected: formatInteger(activity.connectedGuardians),
              total: formatInteger(activity.guardians),
            })}
            tone="white"
            className="col-span-2 lg:col-span-1"
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="contact" className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
          <h2 id="contact" className="mb-2 font-semibold">
            {t("school.contactTitle")}
          </h2>
          <dl className="divide-y divide-line">
            <Row label={t("school.phone")}>
              <span className="tabular-nums">{school.phone ? formatPhone(school.phone) : "—"}</span>
            </Row>
            <Row label={t("school.email")}>{school.email ?? "—"}</Row>
            <Row label={t("school.address")}>
              {[school.address, school.city, school.region].filter(Boolean).join(", ") || "—"}
            </Row>
          </dl>
          {school.phone && (
            <div className="mt-3">
              <ContactButtons phone={school.phone} label={t("school.call")} />
            </div>
          )}
          {direction.length > 0 && (
            <ul className="mt-4 space-y-3 border-t border-line pt-4">
              {direction.map((member) => (
                <li key={member.id} className="space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold text-ink">{member.name}</span>{" "}
                    <span className="text-muted-foreground">
                      · {member.roles.map((role) => tRoles(role)).join(", ")}
                      {member.phone && <span className="tabular-nums"> · {formatPhone(member.phone)}</span>}
                    </span>
                  </p>
                  {member.phone && <ContactButtons phone={member.phone} label={t("school.call")} />}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="setup" className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="setup" className="font-semibold">
              {t("school.setupTitle")}
            </h2>
            <span className="text-sm text-muted-foreground">
              {t("school.setupProgress", { completed: setup.completed, total: setup.total })}
            </span>
          </div>
          <ol className="space-y-2">
            {SETUP_STEPS.map((step) => (
              <li key={step.key} className="flex items-center gap-3 text-sm">
                {setup[step.key] ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                ) : (
                  <Circle className="size-6 shrink-0 text-line" aria-hidden />
                )}
                <span className={cn("flex-1", setup[step.key] ? "text-ink" : "text-ink-soft")}>
                  {tSteps(`${step.key}.title`)}
                </span>
                <span className="sr-only">{setup[step.key] ? t("school.done") : t("school.todo")}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="team" className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 lg:col-span-2">
          <h2 id="team" className="mb-2 font-semibold">
            {t("school.teamTitle")}
          </h2>
          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("school.teamEmpty")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {team.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{member.name}</p>
                    <p className="text-muted-foreground">
                      {member.roles.map((role) => tRoles(role)).join(", ")}
                      {member.phone && <span className="tabular-nums"> · {formatPhone(member.phone)}</span>}
                    </p>
                  </div>
                  {member.active ? (
                    <span className="text-muted-foreground">
                      {member.lastSignIn
                        ? t("school.lastSignIn", { date: formatDate(member.lastSignIn) })
                        : t("school.neverSignedIn")}
                    </span>
                  ) : (
                    <StatusPill tone="neutral">{t("school.suspended")}</StatusPill>
                  )}
                </li>
              ))}
            </ul>
          )}
          {invitations.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="text-sm font-semibold">{t("school.invitationsTitle")}</h3>
              <p className="mb-2 text-sm text-muted-foreground">{t("school.invitationsHint")}</p>
              <ul className="divide-y divide-line">
                {invitations.map((invitation) => (
                  <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{invitation.full_name ?? invitation.email ?? "—"}</p>
                      <p className="text-muted-foreground">
                        {tRoles(invitation.role)}
                        {invitation.phone && <span className="tabular-nums"> · {formatPhone(invitation.phone)}</span>}
                      </p>
                    </div>
                    <span className="text-muted-foreground">
                      {t("school.invitedOn", { date: formatDate(invitation.created_at) })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default function PlatformSchoolPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Detail params={params} />
    </Suspense>
  );
}
