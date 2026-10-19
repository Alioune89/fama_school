/** Nettoie une recherche saisie avant de l'insérer dans un filtre PostgREST (« ilike »). */
export function sanitizeSearch(q: string | null | undefined): string | null {
  const cleaned = (q ?? "").replace(/[%_,()*\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return cleaned.length >= 2 ? cleaned : null;
}
