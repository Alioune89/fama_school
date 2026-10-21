import type { Enums } from "@/lib/supabase/database.types";

type Cycle = Enums<"cycle_code">;
type Sex = Enums<"sex">;

/**
 * Au préscolaire et à l'élémentaire, une classe a un titulaire qui enseigne toutes les matières
 * (éducatrice, instituteur) ; au moyen et au secondaire, un professeur par matière.
 */
export function hasClassTeacher(cycle: Cycle | null | undefined): boolean {
  return cycle === "prescolaire" || cycle === "elementaire";
}

const TITLES: Record<Cycle, Record<Sex, string>> = {
  prescolaire: { F: "Éducatrice", M: "Éducateur" },
  elementaire: { F: "Institutrice", M: "Instituteur" },
  moyen: { F: "Professeure", M: "Professeur" },
  secondaire: { F: "Professeure", M: "Professeur" },
};

/** Titre proposé à l'ajout d'un enseignant (modifiable) ; sans genre connu, la forme masculine. */
export function suggestedTeacherTitle(cycle: Cycle | null | undefined, sex: Sex | null | undefined): string | null {
  if (!cycle) return null;
  return TITLES[cycle][sex ?? "M"];
}
