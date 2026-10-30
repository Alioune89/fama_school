import "server-only";
import { getFeeSchedule } from "@/features/fees/queries";
import { listInvoices } from "@/features/invoices/queries";
import { countPendingJustifications } from "@/features/justifications/queries";
import { listConversations } from "@/features/messaging/queries";
import { listPendingCancellations } from "@/features/payments/queries";
import { countPendingPreregistrations } from "@/features/preregistrations/queries";
import { permissions } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/auth/spaces";
import { overdueByStudent } from "@/lib/domain/collections";
import { createClient } from "@/lib/supabase/server";

export type TodayTaskKey = "rollCalls" | "justifications" | "preregistrations" | "cancellations" | "overdue" | "messages";

export type TodayTask = { key: TodayTaskKey; count: number; href: string };

/** Rôles qui lisent la boîte de réception de l'école (private.inbox_roles). */
const INBOX_ROLES: readonly AppRole[] = ["owner", "director", "censor", "supervisor", "secretary"];

/** Jours de classe : du lundi au vendredi. */
const isSchoolDay = (date: string) => {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
};

/** Classes de l'année en cours sans appel du matin aujourd'hui. */
async function countMissingRollCalls(schoolId: string, today: string) {
  const supabase = await createClient();
  const { data: year } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  if (!year) return 0;
  const [classes, sessions] = await Promise.all([
    supabase.from("classes").select("id").eq("school_id", schoolId).eq("academic_year_id", year.id),
    supabase.from("attendance_sessions").select("class_id").eq("school_id", schoolId).eq("date", today).eq("slot", "morning"),
  ]);
  if (classes.error) throw classes.error;
  if (sessions.error) throw sessions.error;
  const done = new Set(sessions.data.map((session) => session.class_id));
  return classes.data.filter((klass) => !done.has(klass.id)).length;
}

/** Familles avec au moins une facture échue non soldée (même calcul que la page Impayés). */
async function countOverdueFamilies(schoolId: string, today: string) {
  const schedule = await getFeeSchedule(schoolId);
  if (!schedule) return 0;
  const invoices = await listInvoices(schoolId, schedule.year.id, null, today);
  return overdueByStudent(invoices, today).length;
}

async function countUnreadConversations(schoolId: string, userId: string) {
  const conversations = await listConversations("direction", userId, schoolId);
  return conversations.filter((conversation) => conversation.unread).length;
}

/**
 * Ce qui attend la personne connectée aujourd'hui, selon ses rôles : chaque tâche n'apparaît qu'à qui peut
 * la traiter, et seulement s'il y a quelque chose à faire. L'ordre est celui de l'urgence dans la journée.
 */
export async function getTodayTasks(
  schoolId: string,
  userId: string,
  roles: readonly AppRole[],
  today: string,
): Promise<TodayTask[]> {
  const can = (allowed: boolean, key: TodayTaskKey, href: string, count: () => Promise<number>) =>
    allowed ? count().then((value) => ({ key, href, count: value })) : null;

  const tasks = await Promise.all([
    can(permissions.takeAttendance(roles) && isSchoolDay(today), "rollCalls", "/direction/presences", () =>
      countMissingRollCalls(schoolId, today),
    ),
    can(permissions.reviewAbsences(roles), "justifications", "/direction/presences/justificatifs", () =>
      countPendingJustifications(schoolId),
    ),
    can(permissions.managePeople(roles), "preregistrations", "/direction/eleves/preinscriptions", () =>
      countPendingPreregistrations(schoolId),
    ),
    can(permissions.unlockPeriods(roles), "cancellations", "/direction/finances/encaissements", () =>
      listPendingCancellations(schoolId).then((rows) => rows.length),
    ),
    can(permissions.manageFinance(roles), "overdue", "/direction/finances/impayes", () => countOverdueFamilies(schoolId, today)),
    can(
      roles.some((role) => INBOX_ROLES.includes(role)),
      "messages",
      "/direction/messages",
      () => countUnreadConversations(schoolId, userId),
    ),
  ]);
  return tasks.filter((task): task is TodayTask => task !== null && task.count > 0);
}
