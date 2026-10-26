import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SearchInput } from "@/components/data/search-input";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { listStudentInvoices } from "@/features/invoices/queries";
import { RecordPaymentForm } from "@/features/payments/components/record-payment-form";
import { searchStudents } from "@/features/payments/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payments");
  return { title: t("newPayment") };
}

type SearchParams = PageProps<"/[locale]/direction/finances/encaissements/nouveau">["searchParams"];

/** Guichet : choix de l'élève (?q=), puis encaissement sur ses factures dues (?eleve=). */
async function NewPayment({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }, t] = await Promise.all([searchParams, requireSpace("direction"), getTranslations("payments")]);
  if (!permissions.manageFinance(entry.roles)) notFound();
  const schoolId = entry.schoolId!;
  const studentId = typeof params.eleve === "string" ? params.eleve : null;

  if (!studentId) {
    const q = typeof params.q === "string" ? params.q : "";
    const results = await searchStudents(schoolId, q);
    return (
      <section className="max-w-2xl space-y-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">{t("chooseStudent")}</h2>
          <p className="text-sm text-muted-foreground">{t("chooseStudentHint")}</p>
        </div>
        <SearchInput placeholder={t("studentSearchPlaceholder")} label={t("studentSearch")} />
        {q.trim().length >= 2 &&
          (results.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noStudent")}</p>
          ) : (
            <ul className="divide-y divide-line" aria-label={t("studentSearch")}>
              {results.map((student) => (
                <li key={student.id}>
                  <Link
                    href={`/direction/finances/encaissements/nouveau?eleve=${student.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-azure-700"
                  >
                    <span className="font-medium">{student.name}</span>
                    <span className="tabular text-xs text-muted-foreground">{student.matricule}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </section>
    );
  }

  const supabase = await createClient();
  const [{ data: student }, invoices] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, last_name, matricule")
      .eq("school_id", schoolId)
      .eq("id", studentId)
      .maybeSingle(),
    listStudentInvoices(studentId, todayInDakar()),
  ]);
  if (!student) notFound();
  const name = `${student.first_name} ${student.last_name}`;
  const due = invoices
    .filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled")
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.number.localeCompare(b.number))
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      label: invoice.label,
      remaining: invoice.total - invoice.amountPaid,
    }));

  return (
    <section className="max-w-2xl space-y-5 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{name}</h2>
          <p className="tabular text-sm text-muted-foreground">{student.matricule}</p>
        </div>
        <Link href="/direction/finances/encaissements/nouveau" className="text-sm font-semibold text-azure-700 hover:underline">
          {t("changeStudent")}
        </Link>
      </div>
      {due.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noDue", { name })}</p>
      ) : (
        <RecordPaymentForm key={student.id} studentId={student.id} invoices={due} />
      )}
    </section>
  );
}

export default async function NewPaymentPage({ searchParams }: PageProps<"/[locale]/direction/finances/encaissements/nouveau">) {
  const t = await getTranslations("payments");
  return (
    <>
      <Link
        href="/direction/finances/encaissements"
        className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <PageHeader title={t("newPayment")} />
      <Suspense fallback={<div className="h-80 max-w-2xl animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <NewPayment searchParams={searchParams} />
      </Suspense>
    </>
  );
}
