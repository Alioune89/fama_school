import type { AttendanceSlot, AttendanceStatus } from "@/lib/offline/operations";

/** Règles de l'appel, sans dépendance au navigateur ni à la base (testées dans roll-call.test.ts). */

export type Marks = Record<string, AttendanceStatus>;
export type RosterStudent = { id: string; firstName: string; lastName: string };

/** Appel tel qu'enregistré sur le serveur. */
export type ServerRollCall = { takenAt: string; marks: Marks };

/** Saisie locale : `validatedAt` vaut null tant que les dernières modifications n'ont pas été validées. */
export type RollCallDraft = { marks: Marks; validatedAt: string | null; updatedAt: string };

/** Après 13 h (heure de Dakar, soit UTC), l'appel proposé est celui de l'après-midi. */
export function defaultSlot(now: Date = new Date()): AttendanceSlot {
  return now.getUTCHours() < 13 ? "morning" : "afternoon";
}

/** Un toucher fait passer l'élève de présent à absent, puis en retard, puis de nouveau présent. */
export function nextStatus(status: AttendanceStatus): AttendanceStatus {
  return status === "present" ? "absent" : status === "absent" ? "late" : "present";
}

export const rollCallRef = (classId: string, date: string, slot: AttendanceSlot) => `rollCall:${classId}:${date}:${slot}`;

/**
 * Appel à afficher : la saisie du téléphone si elle est plus récente que l'appel du serveur
 * (validée ou non, pas encore envoyée), sinon l'appel du serveur, sinon tout le monde présent.
 * Chaque élève de la liste reçoit un statut (un élève arrivé après l'appel est présent par défaut).
 */
export function resolveRollCall(
  roster: RosterStudent[],
  server: ServerRollCall | null,
  draft: RollCallDraft | null,
): { marks: Marks; validatedAt: string | null } {
  const useDraft = draft !== null && (server === null || draft.updatedAt > server.takenAt);
  const source = useDraft ? draft.marks : (server?.marks ?? {});
  const marks: Marks = {};
  for (const student of roster) marks[student.id] = source[student.id] ?? "present";
  return { marks, validatedAt: useDraft ? draft.validatedAt : (server?.takenAt ?? null) };
}

export function countMarks(marks: Marks) {
  const counts = { present: 0, absent: 0, late: 0 };
  for (const status of Object.values(marks)) counts[status] += 1;
  return counts;
}
