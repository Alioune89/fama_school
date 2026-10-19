/** Étapes de la mise en route d'une école, dans l'ordre où elles se font. */
export const SETUP_STEPS = [
  { key: "school", href: "/direction/parametres/ecole" },
  { key: "year", href: "/direction/parametres/annee" },
  { key: "levels", href: "/direction/parametres/niveaux" },
  { key: "subjects", href: "/direction/parametres/matieres" },
  { key: "classes", href: "/direction/parametres/classes" },
  { key: "evaluation", href: "/direction/parametres/evaluation" },
] as const;

export type SetupStepKey = (typeof SETUP_STEPS)[number]["key"];

export type SetupFacts = {
  school: { city: string | null; phone: string | null };
  hasCurrentYear: boolean;
  levelsCount: number;
  levelSubjectsCount: number;
  classesCount: number;
  /** Réglages d'évaluation enregistrés au moins une fois (sinon valeurs par défaut). */
  evaluationSaved: boolean;
};

export type SetupStatus = Record<SetupStepKey, boolean> & { completed: number; total: number; nextStep: SetupStepKey | null };

export function computeSetupStatus(facts: SetupFacts): SetupStatus {
  const done: Record<SetupStepKey, boolean> = {
    school: Boolean(facts.school.city && facts.school.phone),
    year: facts.hasCurrentYear,
    levels: facts.levelsCount > 0,
    subjects: facts.levelSubjectsCount > 0,
    classes: facts.classesCount > 0,
    evaluation: facts.evaluationSaved,
  };
  const completed = Object.values(done).filter(Boolean).length;
  const nextStep = SETUP_STEPS.find((step) => !done[step.key])?.key ?? null;
  return { ...done, completed, total: SETUP_STEPS.length, nextStep };
}

export function stepIndex(key: SetupStepKey): number {
  return SETUP_STEPS.findIndex((step) => step.key === key);
}
