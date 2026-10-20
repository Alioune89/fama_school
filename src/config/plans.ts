import type { Enums } from "@/lib/supabase/database.types";

/**
 * Formules d'abonnement (cahier des charges, section 11) : forfait mensuel par école selon l'effectif,
 * facturé sur 10 mois (octobre à juillet) ; l'année payée d'avance offre 2 mois. Gratuit pour les parents.
 */
export type PublicPlan = {
  id: Exclude<Enums<"school_plan">, "pilot">;
  /** Effectif maximal couvert (null : au-delà, sur devis). */
  maxStudents: number | null;
  /** Prix mensuel en FCFA (null : sur devis). */
  monthly: number | null;
  highlighted?: boolean;
};

export const BILLED_MONTHS = 10;
export const FREE_MONTHS_YEARLY = 2;

export const PUBLIC_PLANS: PublicPlan[] = [
  { id: "starter", maxStudents: 200, monthly: 60_000 },
  { id: "school", maxStudents: 500, monthly: 120_000, highlighted: true },
  { id: "establishment", maxStudents: 1_000, monthly: 220_000 },
  { id: "group", maxStudents: null, monthly: null },
];

/** Prix annuel payé d'avance : 10 mois facturés, dont 2 offerts. */
export const yearlyPrice = (monthly: number) => monthly * (BILLED_MONTHS - FREE_MONTHS_YEARLY);
