import "server-only";
import { invoiceStatus, type InvoiceStatus } from "@/lib/domain/fees";
import { createClient } from "@/lib/supabase/server";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

export type InvoiceRow = {
  id: string;
  number: string;
  label: string;
  studentId: string;
  studentName: string;
  className: string | null;
  /** Premier jour du mois facturé ; null : frais annuels. */
  billingMonth: string | null;
  issuedOn: string;
  dueOn: string;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
};

const SELECT =
  "id, number, label, student_id, billing_month, issued_on, due_on, total, amount_paid, cancelled_at, academic_year_id, student:students(first_name, last_name, enrollments(status, academic_year_id, class:classes!enrollments_class_id_school_id_fkey(name)))";

type Raw = {
  id: string;
  number: string;
  label: string;
  student_id: string;
  billing_month: string | null;
  issued_on: string;
  due_on: string;
  total: number;
  amount_paid: number;
  cancelled_at: string | null;
  academic_year_id: string;
  student: {
    first_name: string;
    last_name: string;
    enrollments: { status: string; academic_year_id: string; class: { name: string } | null }[];
  } | null;
};

function toRow(row: Raw, today: string): InvoiceRow {
  const enrollment = row.student?.enrollments.find((e) => e.academic_year_id === row.academic_year_id && e.status === "active");
  return {
    id: row.id,
    number: row.number,
    label: row.label,
    studentId: row.student_id,
    studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "",
    className: enrollment?.class?.name ?? null,
    billingMonth: row.billing_month,
    issuedOn: row.issued_on,
    dueOn: row.due_on,
    total: row.total,
    amountPaid: row.amount_paid,
    status: invoiceStatus(
      { total: row.total, amountPaid: row.amount_paid, cancelled: row.cancelled_at !== null, dueOn: row.due_on },
      today,
    ),
  };
}

/**
 * Factures de l'année : d'un mois (« 2026-10 »), des frais annuels (« annual ») ou toutes ;
 * par élève puis par numéro.
 */
export async function listInvoices(
  schoolId: string,
  yearId: string,
  month: string | "annual" | null,
  today: string,
): Promise<InvoiceRow[]> {
  const supabase = await createClient();
  let query = supabase.from("invoices").select(SELECT).eq("school_id", schoolId).eq("academic_year_id", yearId).limit(5000);
  if (month === "annual") query = query.is("billing_month", null);
  else if (month) query = query.eq("billing_month", `${month}-01`);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Raw[])
    .map((row) => toRow(row, today))
    .sort((a, b) => byName(a.studentName, b.studentName) || a.number.localeCompare(b.number));
}

/** Factures d'un élève, de la plus récente à la plus ancienne (direction ou parent : la RLS limite). */
export async function listStudentInvoices(studentId: string, today: string): Promise<InvoiceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(SELECT)
    .eq("student_id", studentId)
    .order("issued_on", { ascending: false })
    .order("number", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as Raw[]).map((row) => toRow(row, today));
}

export type InvoiceDetail = InvoiceRow & {
  cancelReason: string | null;
  lines: { id: string; label: string; baseAmount: number; discountPercent: number; amount: number }[];
};

export async function getInvoice(schoolId: string, id: string, today: string): Promise<InvoiceDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(`${SELECT}, cancel_reason, lines:invoice_lines(id, label, base_amount, discount_percent, amount, position)`)
    .eq("school_id", schoolId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Raw & {
    cancel_reason: string | null;
    lines: { id: string; label: string; base_amount: number; discount_percent: number; amount: number; position: number }[];
  };
  return {
    ...toRow(row, today),
    cancelReason: row.cancel_reason,
    lines: [...row.lines]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        id: l.id,
        label: l.label,
        baseAmount: l.base_amount,
        discountPercent: Number(l.discount_percent),
        amount: l.amount,
      })),
  };
}
