/**
 * Couleurs des séries filles / garçons, validées sur fond blanc avec le validateur du skill dataviz
 * (daltonisme, écart en vision normale). Le bleu ciel est peu contrasté : les effectifs restent écrits en texte.
 */
export const SERIES = {
  girls: { bar: "bg-lavender-600", stroke: "border-lavender-600" },
  boys: { bar: "bg-azure-500", stroke: "border-azure-500" },
} as const;
