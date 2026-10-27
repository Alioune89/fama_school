import "server-only";
import type { OverdueStudent } from "@/lib/domain/collections";
import { parseSchoolSettings } from "@/lib/domain/school-settings";
import { createClient } from "@/lib/supabase/server";

export type ReminderChannel = "whatsapp" | "sms" | "call";

export type OverdueFamily = OverdueStudent & {
  studentName: string;
  firstName: string;
  className: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  lastReminder: { channel: ReminderChannel; sentAt: string } | null;
};

/** Élèves en retard avec leur classe, leur parent principal (téléphone) et leur dernière relance. */
export async function withFamilies(schoolId: string, overdue: OverdueStudent[]): Promise<OverdueFamily[]> {
  if (overdue.length === 0) return [];
  const ids = overdue.map((student) => student.studentId);
  const supabase = await createClient();
  const [studentsResult, remindersResult] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, first_name, last_name, enrollments(status, class:classes!enrollments_class_id_school_id_fkey(name, year:academic_years(is_current))), student_guardians(is_primary, guardian:guardians(full_name, phone))",
      )
      .eq("school_id", schoolId)
      .in("id", ids),
    supabase
      .from("payment_reminders")
      .select("student_id, channel, sent_at")
      .eq("school_id", schoolId)
      .in("student_id", ids)
      .order("sent_at", { ascending: false })
      .limit(2000),
  ]);
  if (studentsResult.error) throw studentsResult.error;
  if (remindersResult.error) throw remindersResult.error;

  const lastReminders = new Map<string, OverdueFamily["lastReminder"]>();
  for (const reminder of remindersResult.data ?? []) {
    if (!lastReminders.has(reminder.student_id)) {
      lastReminders.set(reminder.student_id, { channel: reminder.channel as ReminderChannel, sentAt: reminder.sent_at });
    }
  }
  const students = new Map((studentsResult.data ?? []).map((student) => [student.id, student]));

  return overdue.flatMap((entry) => {
    const student = students.get(entry.studentId);
    if (!student) return [];
    const enrollment = student.enrollments.find((e) => e.status === "active" && e.class?.year?.is_current);
    const guardians = [...student.student_guardians].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    const guardian = guardians.find((link) => link.guardian?.phone)?.guardian ?? guardians[0]?.guardian ?? null;
    return [
      {
        ...entry,
        studentName: `${student.first_name} ${student.last_name}`,
        firstName: student.first_name,
        className: enrollment?.class?.name ?? null,
        guardianName: guardian?.full_name ?? null,
        guardianPhone: guardian?.phone ?? null,
        lastReminder: lastReminders.get(entry.studentId) ?? null,
      },
    ];
  });
}

/** Réglage « bloquer le téléchargement des bulletins en cas d'impayé ». */
export async function getUnpaidPolicy(schoolId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("schools").select("name, settings").eq("id", schoolId).single();
  if (error) throw error;
  return { schoolName: data.name, blockReportCards: parseSchoolSettings(data.settings).blockReportCardsWhenOverdue };
}
