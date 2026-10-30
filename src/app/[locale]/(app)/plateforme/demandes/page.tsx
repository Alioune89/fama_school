import { Suspense } from "react";
import type { Metadata } from "next";
import { Inbox, Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DemoStatusSelect } from "@/features/platform/components/demo-status-select";
import { listDemoRequests } from "@/features/platform/queries";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.demoRequests");
  return { title: t("title") };
}

async function DemoRequests() {
  await requireSpace("plateforme");
  const [requests, t, tLanding] = await Promise.all([
    listDemoRequests(),
    getTranslations("platform.demoRequests"),
    getTranslations("landing.demo"),
  ]);

  if (requests.length === 0) return <EmptyState icon={Inbox} title={t("empty")} body={t("emptyHint")} />;
  const fresh = requests.filter((request) => request.status === "new").length;

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">{t("count", { count: requests.length, fresh })}</p>
      <ul className="grid gap-3">
        {requests.map((request) => (
          <li
            key={request.id}
            className="grid gap-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 lg:grid-cols-[1.1fr_1.1fr_1.4fr_auto] lg:items-start"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink">{request.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {[request.role && tLanding(`roles.${request.role as "founder"}`), formatDate(request.created_at.slice(0, 10))]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <a
                href={`tel:${request.phone}`}
                className="tabular mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
              >
                <Phone className="size-4" aria-hidden />
                {formatPhone(request.phone)}
              </a>
              {request.email && (
                <a
                  href={`mailto:${request.email}`}
                  className="flex items-center gap-1.5 truncate text-sm text-ink-soft hover:text-ink"
                >
                  <Mail className="size-4 shrink-0" aria-hidden />
                  {request.email}
                </a>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{request.school_name}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  request.city,
                  request.students_range && t("students", { range: tLanding(`ranges.${request.students_range as "lt200"}`) }),
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <p className="text-sm whitespace-pre-line text-ink-soft">{request.message ?? "—"}</p>
            <DemoStatusSelect id={request.id} name={request.full_name} status={request.status} />
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function DemoRequestsPage() {
  const t = await getTranslations("platform.demoRequests");
  return (
    <>
      <PageHeader title={t("title")} description={t("hint")} />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <DemoRequests />
      </Suspense>
    </>
  );
}
