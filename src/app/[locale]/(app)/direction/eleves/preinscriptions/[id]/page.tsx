import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft, FileText, MessageCircle, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PreregistrationActions } from "@/features/preregistrations/components/preregistration-actions";
import { STATUS_TONES } from "@/features/preregistrations/components/status-tones";
import { getPreregistration, listEnrollmentClasses } from "@/features/preregistrations/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

type Props = PageProps<"/[locale]/direction/eleves/preinscriptions/[id]">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("preregistrations");
  return { title: t("title") };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}

async function Detail({ params }: Props) {
  const { id } = await params;
  const { entry } = await requireSpace("direction");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !permissions.managePeople(entry.roles)) notFound();
  const request = await getPreregistration(entry.schoolId!, id);
  if (!request) notFound();
  const [classes, t, tSex, tRelationship] = await Promise.all([
    request.status === "enrolled" ? [] : listEnrollmentClasses(entry.schoolId!, request.level?.id ?? null),
    getTranslations("preregistrations"),
    getTranslations("students.sex"),
    getTranslations("students.relationships"),
  ]);
  const childName = `${request.child.firstName} ${request.child.lastName}`;
  const whatsapp = `https://wa.me/${request.guardian.phone.replace(/\D/g, "")}`;

  return (
    <>
      <PageHeader
        title={childName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill tone={STATUS_TONES[request.status]}>{t(`statuses.${request.status}`)}</StatusPill>
            <span className="tabular-nums">{request.reference}</span>
            <span>· {t("receivedOn", { date: formatDate(request.createdAt) })}</span>
          </span>
        }
        actions={
          request.studentId ? (
            <Link href={`/direction/eleves/${request.studentId}`} className={buttonVariants({ variant: "outline" })}>
              {t("openStudent")}
            </Link>
          ) : (
            <PreregistrationActions id={request.id} status={request.status} childName={childName} classes={classes} />
          )
        }
      />

      {request.decisionNote && (
        <p className="mb-5 rounded-xl bg-azure-50 px-4 py-3 text-sm">
          <span className="font-semibold">{t("decisionNote")}</span> {request.decisionNote}
        </p>
      )}
      {request.status !== "enrolled" && classes.length === 0 && (
        <p className="mb-5 rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-700">{t("noClasses")}</p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
          <h2 className="mb-2 font-semibold">{t("childTitle")}</h2>
          <dl className="divide-y divide-line">
            <Row label={t("level")}>{request.level?.label ?? "—"}</Row>
            <Row label={t("sex")}>{tSex(request.child.sex)}</Row>
            <Row label={t("birthDate")}>{request.child.birthDate ? formatDate(request.child.birthDate) : "—"}</Row>
            <Row label={t("previousSchool")}>{request.child.previousSchool ?? "—"}</Row>
          </dl>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
          <h2 className="mb-2 font-semibold">{t("guardianTitle")}</h2>
          <dl className="divide-y divide-line">
            <Row label={t("guardianName")}>
              {request.guardian.name} ({tRelationship(request.guardian.relationship).toLowerCase()})
            </Row>
            <Row label={t("phone")}>
              <span className="tabular-nums">{formatPhone(request.guardian.phone)}</span>
            </Row>
            <Row label={t("email")}>{request.guardian.email ?? "—"}</Row>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${request.guardian.phone}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Phone aria-hidden />
              {t("call")}
            </a>
            <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <MessageCircle aria-hidden />
              {t("whatsapp")}
            </a>
          </div>
        </section>

        {request.message && (
          <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <h2 className="mb-2 font-semibold">{t("message")}</h2>
            <p className="text-sm whitespace-pre-line text-ink-soft">{request.message}</p>
          </section>
        )}

        <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
          <h2 className="mb-2 font-semibold">{t("attachments")}</h2>
          {request.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAttachments")}</p>
          ) : (
            <ul className="grid gap-2">
              {request.attachments.map((file) => (
                <li key={file.path}>
                  <a
                    href={file.url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm ring-1 ring-line hover:bg-azure-50/60"
                  >
                    <FileText className="size-5 shrink-0 text-ink-soft" aria-hidden />
                    <span className="min-w-0 truncate">{file.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default async function PreregistrationPage(props: Props) {
  const t = await getTranslations("preregistrations");
  return (
    <>
      <Link
        href="/direction/eleves/preinscriptions"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("title")}
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Detail {...props} />
      </Suspense>
    </>
  );
}
