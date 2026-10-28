import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AVAILABILITY, type Availability } from "./availability";

export type MessagingSide = "parent" | "teacher" | "direction";

export type ConversationSummary = {
  id: string;
  subject: string;
  studentName: string;
  /** L'autre côté : le professeur ou la direction pour un parent, le parent pour le personnel. */
  counterpart: string | null;
  lastBody: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: boolean;
};

type ConversationRow = {
  id: string;
  subject: string;
  parent_name: string;
  teacher_name: string | null;
  teacher_id: string | null;
  last_message_at: string;
  student: { first_name: string; last_name: string } | null;
};

const SELECT = "id, subject, parent_name, teacher_name, teacher_id, last_message_at, student:students(first_name, last_name)";

/** Conversations du compte connecté, de la plus récente à la plus ancienne (la RLS limite). */
export async function listConversations(side: MessagingSide, userId: string, schoolId?: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  let query = supabase.from("conversations").select(SELECT).order("last_message_at", { ascending: false }).limit(100);
  if (side === "parent") query = query.eq("parent_id", userId);
  else if (side === "teacher") query = query.eq("teacher_id", userId);
  else query = query.is("teacher_id", null).eq("school_id", schoolId!);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as ConversationRow[];
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [messages, reads] = await Promise.all([
    supabase
      .from("messages")
      .select("conversation_id, body, sender_id, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("conversation_reads").select("conversation_id, read_at").in("conversation_id", ids),
  ]);
  const last = new Map<string, { body: string; sender_id: string | null }>();
  for (const message of messages.data ?? []) if (!last.has(message.conversation_id)) last.set(message.conversation_id, message);
  const readAt = new Map((reads.data ?? []).map((read) => [read.conversation_id, read.read_at]));
  return rows.map((row) => {
    const message = last.get(row.id);
    const fromMe = message?.sender_id === userId;
    const read = readAt.get(row.id);
    return {
      id: row.id,
      subject: row.subject,
      studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "",
      counterpart: side === "parent" ? row.teacher_name : row.parent_name,
      lastBody: message?.body ?? "",
      lastAt: row.last_message_at,
      lastFromMe: fromMe,
      unread: !fromMe && (!read || read < row.last_message_at),
    };
  });
}

export type ThreadMessage = { id: string; body: string; senderName: string; mine: boolean; createdAt: string };

export type Thread = {
  id: string;
  subject: string;
  studentName: string;
  counterpart: string | null;
  teacherId: string | null;
  parentId: string;
  messages: ThreadMessage[];
};

/** Une conversation et ses messages (la RLS limite aux participants). */
export async function getThread(id: string, userId: string): Promise<Thread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("conversations").select(`${SELECT}, parent_id`).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as ConversationRow & { parent_id: string };
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, body, sender_id, sender_name, created_at")
    .eq("conversation_id", id)
    .order("created_at")
    .limit(500);
  if (messagesError) throw messagesError;
  const isParent = row.parent_id === userId;
  return {
    id: row.id,
    subject: row.subject,
    studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "",
    counterpart: isParent ? row.teacher_name : row.parent_name,
    teacherId: row.teacher_id,
    parentId: row.parent_id,
    messages: (messages ?? []).map((message) => ({
      id: message.id,
      body: message.body,
      senderName: message.sender_name,
      mine: message.sender_id === userId,
      createdAt: message.created_at,
    })),
  };
}

/** Horaires de réponse de professeurs (par défaut : du lundi au vendredi, de 8 h à 18 h). */
export async function getAvailabilities(userIds: string[]): Promise<Map<string, Availability>> {
  const result = new Map<string, Availability>();
  if (userIds.length === 0) return result;
  const supabase = await createClient();
  const { data } = await supabase.from("staff_availability").select("user_id, days, starts_at, ends_at").in("user_id", userIds);
  const found = new Map((data ?? []).map((row) => [row.user_id, row]));
  for (const id of userIds) {
    const row = found.get(id);
    result.set(
      id,
      row ? { days: row.days, startsAt: row.starts_at.slice(0, 5), endsAt: row.ends_at.slice(0, 5) } : DEFAULT_AVAILABILITY,
    );
  }
  return result;
}

export type TeacherContact = { userId: string; name: string; subjects: string[]; homeroom: boolean; availability: Availability };

/** Professeurs de la classe d'un enfant, avec leurs horaires (pour le parent). */
export async function listTeacherContacts(studentId: string): Promise<TeacherContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_contacts", { p_student_id: studentId });
  if (error) throw error;
  const contacts = (data ?? []) as Omit<TeacherContact, "availability">[];
  const availabilities = await getAvailabilities(contacts.map((contact) => contact.userId));
  return contacts.map((contact) => ({ ...contact, availability: availabilities.get(contact.userId)! }));
}

export type StudentOption = { id: string; name: string; className: string | null };

/** Élèves auxquels le personnel peut écrire : la RLS limite un professeur aux élèves de ses classes. */
export async function listStudentOptions(schoolId: string): Promise<StudentOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      "student:students!inner(id, first_name, last_name), class:classes!enrollments_class_id_school_id_fkey!inner(name, year:academic_years!inner(is_current))",
    )
    .eq("school_id", schoolId)
    .eq("status", "active")
    .eq("class.year.is_current", true)
    .limit(5000);
  if (error) throw error;
  return (data ?? [])
    .flatMap((row) =>
      row.student
        ? [{ id: row.student.id, name: `${row.student.first_name} ${row.student.last_name}`, className: row.class?.name ?? null }]
        : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
