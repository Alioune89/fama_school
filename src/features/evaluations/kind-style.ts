import type { EvaluationKind } from "./schemas";

/** Type d'évaluation : libellé toujours écrit, couleur en complément. */
export const KIND_STYLE: Record<EvaluationKind, string> = {
  devoir: "bg-azure-50 text-azure-700",
  interrogation: "bg-lavender-50 text-lavender-700",
  composition: "bg-warning-50 text-warning-700",
};
