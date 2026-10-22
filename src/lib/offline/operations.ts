import { z } from "zod";

/**
 * Opérations que le téléphone peut enregistrer hors ligne puis envoyer à `POST /api/sync`.
 * Partagé entre le navigateur (mise en file) et le serveur (validation avant l'appel SQL).
 * Chaque opération porte un identifiant généré sur le téléphone : la base ne l'applique qu'une fois.
 */
const isoDate = z.iso.date();

export const ATTENDANCE_STATUSES = ["present", "absent", "late"] as const;
export const ATTENDANCE_SLOTS = ["morning", "afternoon"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type AttendanceSlot = (typeof ATTENDANCE_SLOTS)[number];

export const rollCallPayloadSchema = z.object({
  classId: z.uuid(),
  date: isoDate,
  slot: z.enum(ATTENDANCE_SLOTS),
  /** Heure de l'appel sur le téléphone : le plus récent l'emporte, quelle que soit l'heure d'envoi. */
  takenAt: z.iso.datetime(),
  marks: z.record(z.uuid(), z.enum(ATTENDANCE_STATUSES)),
});

export type RollCallPayload = z.infer<typeof rollCallPayloadSchema>;

export const REPORT_CATEGORIES = ["behavior", "health", "homework", "equipment", "other"] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const studentReportPayloadSchema = z.object({
  studentId: z.uuid(),
  classId: z.uuid(),
  category: z.enum(REPORT_CATEGORIES),
  message: z.string().trim().min(3, "validation.tooShort").max(1000, "validation.tooLong"),
  /** Moment du signalement sur le téléphone. */
  occurredAt: z.iso.datetime(),
});

export type StudentReportPayload = z.infer<typeof studentReportPayloadSchema>;

export const arrivalPayloadSchema = z.object({
  studentId: z.uuid(),
  /** Heure du scan de la carte sur le téléphone : le premier passage de la journée compte. */
  scannedAt: z.iso.datetime(),
});

export type ArrivalPayload = z.infer<typeof arrivalPayloadSchema>;

export const operationSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.uuid(), kind: z.literal("attendance.rollCall"), payload: rollCallPayloadSchema }),
  z.object({ id: z.uuid(), kind: z.literal("student.report"), payload: studentReportPayloadSchema }),
  z.object({ id: z.uuid(), kind: z.literal("checkin.arrival"), payload: arrivalPayloadSchema }),
]);

export type Operation = z.infer<typeof operationSchema>;
export type OperationKind = Operation["kind"];

/** Nombre d'opérations envoyées par requête. */
export const SYNC_BATCH_SIZE = 20;

export const syncRequestSchema = z.object({
  /** Compte qui a enregistré les opérations : un téléphone partagé n'envoie jamais celles d'un autre compte. */
  userId: z.uuid(),
  operations: z.array(z.unknown()).min(1).max(SYNC_BATCH_SIZE),
});

/**
 * Issue d'une opération côté serveur :
 * - applied : enregistrée ; duplicate : déjà reçue ; stale : une version plus récente existe déjà
 *   (dans ces trois cas, le téléphone la retire de sa file) ;
 * - rejected : refusée pour de bon (droits, données invalides) : affichée à l'utilisateur ;
 * - retry : erreur passagère, nouvel essai plus tard.
 */
export type OperationOutcome =
  | { id: string; status: "applied" | "duplicate" | "stale" }
  | { id: string; status: "rejected"; error: string }
  | { id: string; status: "retry" };

export type SyncResponse = { results: OperationOutcome[] };
