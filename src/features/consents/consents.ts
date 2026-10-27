/** Version des textes de consentement présentés (à changer quand les textes changent : on redemande). */
export const CONSENT_VERSION = "2026-10";

/** Données : indispensable pour utiliser l'espace. Photos et géolocalisation : facultatives. */
export const CONSENT_KINDS = ["data", "photos", "location"] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

export type Consents = Record<ConsentKind, boolean>;
