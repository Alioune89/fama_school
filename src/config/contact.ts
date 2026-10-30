/** Coordonnées publiques de Fama School (page d'accueil, pied de page, alerte de l'équipe). */
export const CONTACT = {
  /** Numéro WhatsApp affiché aux écoles (format E.164). */
  whatsapp: "+221777650980",
} as const;

/** Lien wa.me avec un message pré-rempli. */
export const whatsappLink = (text: string) =>
  `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
