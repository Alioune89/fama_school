import type { AppRole } from "./spaces";

/**
 * Miroir côté application des règles de la base (fonctions private.* de la RLS).
 * Sert à afficher ou masquer les actions ; la base reste seule garante de la sécurité.
 */
const hasAny = (roles: readonly AppRole[], allowed: readonly AppRole[]) => roles.some((role) => allowed.includes(role));

export const permissions = {
  /** Identité de l'école, rôles de direction (private.can_manage_members). */
  manageSchool: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director"]),
  /** Année, niveaux, matières, classes, affectations (private.can_manage_academics). */
  manageAcademics: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director", "censor"]),
  /** Déverrouiller une période de notes (public.set_period_lock) : le censeur verrouille, sans pouvoir rouvrir. */
  unlockPeriods: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director"]),
  /** Frais, factures, encaissements, dépenses (private.can_manage_finance). */
  manageFinance: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director", "accountant"]),
  /** Élèves, inscriptions, parents (private.can_manage_people). */
  managePeople: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director", "secretary"]),
  /** Candidats et résultats des examens nationaux (private.can_manage_exams : pédagogie ou scolarité). */
  manageExams: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director", "censor", "secretary"]),
  /** Appel de n'importe quelle classe (private.can_take_attendance, hors enseignants de la classe). */
  takeAttendance: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director", "censor", "supervisor"]),
  /** Pointage des arrivées par QR code (private.can_record_arrivals). */
  recordArrivals: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director", "censor", "supervisor"]),
  /** Décision sur les justificatifs d'absence (private.can_review_absences). */
  reviewAbsences: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director", "censor", "supervisor"]),
  /** Annonces et calendrier de l'école (private.can_publish). */
  publish: (roles: readonly AppRole[]) => hasAny(roles, ["owner", "director", "censor", "secretary"]),
  /** Ajout au répertoire selon le rôle visé (private.can_invite). */
  inviteRole: (roles: readonly AppRole[], target: AppRole) => {
    if (target === "owner") return hasAny(roles, ["owner"]);
    if (target === "teacher" || target === "parent" || target === "driver")
      return hasAny(roles, ["owner", "director", "secretary"]);
    return hasAny(roles, ["owner", "director"]);
  },
} as const;

export type Permission = keyof typeof permissions;
