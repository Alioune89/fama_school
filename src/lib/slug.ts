/** Identifiant d'URL lisible : « Institut Franco-Arabe Al Amine » → « institut-franco-arabe-al-amine ». */
export function slugify(input: string, maxLength = 60): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Premier identifiant libre : « les-baobabs », puis « les-baobabs-2 »… */
export function nextAvailableSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let index = 2; index < 1000; index++) {
    const candidate = `${base}-${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Aucun identifiant libre pour ${base}`);
}
