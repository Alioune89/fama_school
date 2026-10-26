import "server-only";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type PaymentRow = {
  id: string;
  number: string;
  code: string;
  studentId: string;
  studentName: string;
  matricule: string;
  method: Enums<"payment_method">;
  amount: number;
  reference: string | null;
  receivedOn: string;
  status: Enums<"payment_status">;
};

const SELECT =
  "id, number, code, student_id, method, amount, reference, received_on, status, student:students(first_name, last_name, matricule)";

type Raw = {
  id: string;
  number: string;
  code: string;
  student_id: string;
  method: Enums<"payment_method">;
  amount: number;
  reference: string | null;
  received_on: string;
  status: Enums<"payment_status">;
  student: { first_name: string; last_name: string; matricule: string } | null;
};

const toRow = (row: Raw): PaymentRow => ({
  id: row.id,
  number: row.number,
  code: row.code,
  studentId: row.student_id,
  studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "",
  matricule: row.student?.matricule ?? "",
  method: row.method,
  amount: row.amount,
  reference: row.reference,
  receivedOn: row.received_on,
  status: row.status,
});

/** Encaissements d'un mois (« 2026-10 »), du plus récent au plus ancien. */
export async function listPayments(schoolId: string, month: string): Promise<PaymentRow[]> {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const next = index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, "0")}`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(SELECT)
    .eq("school_id", schoolId)
    .gte("received_on", `${month}-01`)
    .lt("received_on", `${next}-01`)
    .order("received_on", { ascending: false })
    .order("number", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as Raw[]).map(toRow);
}

/** Demandes d'annulation en attente de décision, toutes dates confondues. */
export async function listPendingCancellations(schoolId: string): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(SELECT)
    .eq("school_id", schoolId)
    .eq("status", "cancel_requested")
    .order("cancel_requested_at");
  if (error) throw error;
  return ((data ?? []) as Raw[]).map(toRow);
}

/** Reçus d'un élève, du plus récent au plus ancien (direction ou parent : la RLS limite). */
export async function listStudentPayments(studentId: string): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(SELECT)
    .eq("student_id", studentId)
    .order("received_on", { ascending: false })
    .order("number", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as Raw[]).map(toRow);
}

export type PaymentDetail = PaymentRow & {
  schoolId: string;
  note: string | null;
  cancelReason: string | null;
  cancelRequestedBy: string | null;
  className: string | null;
  allocations: { invoiceId: string; number: string; label: string; amount: number; remaining: number }[];
  school: {
    name: string;
    city: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
};

/** Un reçu : élève, factures réglées, école (en-tête du reçu). La RLS limite l'accès. */
export async function getPayment(id: string): Promise<PaymentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      `${SELECT}, school_id, note, cancel_reason, cancel_requested_by, allocations:payment_allocations(amount, invoice:invoices(id, number, label, total, amount_paid, academic_year_id))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Raw & {
    school_id: string;
    note: string | null;
    cancel_reason: string | null;
    cancel_requested_by: string | null;
    allocations: {
      amount: number;
      invoice: { id: string; number: string; label: string; total: number; amount_paid: number; academic_year_id: string } | null;
    }[];
  };
  const [schoolResult, enrollmentResult] = await Promise.all([
    supabase.from("schools").select("name, city, address, phone, email, logo_path").eq("id", row.school_id).single(),
    supabase
      .from("enrollments")
      .select("class:classes!enrollments_class_id_school_id_fkey(name, year:academic_years!inner(is_current))")
      .eq("student_id", row.student_id)
      .eq("status", "active")
      .eq("class.year.is_current", true)
      .not("class", "is", null)
      .maybeSingle(),
  ]);
  if (schoolResult.error) throw schoolResult.error;
  const school = schoolResult.data;
  return {
    ...toRow(row),
    schoolId: row.school_id,
    note: row.note,
    cancelReason: row.cancel_reason,
    cancelRequestedBy: row.cancel_requested_by,
    className: enrollmentResult.data?.class?.name ?? null,
    allocations: row.allocations
      .flatMap((a) =>
        a.invoice
          ? [
              {
                invoiceId: a.invoice.id,
                number: a.invoice.number,
                label: a.invoice.label,
                amount: a.amount,
                remaining: a.invoice.total - a.invoice.amount_paid,
              },
            ]
          : [],
      )
      .sort((a, b) => a.number.localeCompare(b.number)),
    school: {
      name: school.name,
      city: school.city,
      address: school.address,
      phone: school.phone,
      email: school.email,
      logoUrl: school.logo_path ? supabase.storage.from("school-logos").getPublicUrl(school.logo_path).data.publicUrl : null,
    },
  };
}

/** Élèves de l'école dont chaque mot cherché (« Mariama Sow ») est dans le prénom, le nom ou le matricule. */
export async function searchStudents(schoolId: string, q: string) {
  const words = q
    .replace(/[%,()*]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .slice(0, 4);
  if (words.length === 0) return [];
  const supabase = await createClient();
  let query = supabase.from("students").select("id, first_name, last_name, matricule").eq("school_id", schoolId);
  for (const word of words) query = query.or(`first_name.ilike.%${word}%,last_name.ilike.%${word}%,matricule.ilike.%${word}%`);
  const { data, error } = await query.order("last_name").order("first_name").limit(10);
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, matricule: s.matricule }));
}
