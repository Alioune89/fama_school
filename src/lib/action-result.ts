import type { z } from "zod";

/**
 * Résultat d'une Server Action. Les messages sont des clés de traduction (ex. « validation.required »),
 * traduites côté client : le serveur ne connaît pas la langue d'affichage dans une action.
 */
export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: FieldErrors };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = (error: string, fieldErrors?: FieldErrors): { ok: false; error: string; fieldErrors?: FieldErrors } => ({
  ok: false,
  error,
  fieldErrors,
});

/** Une clé de traduction (« validation.required », « settings.errors.thresholdsOrder »). */
const MESSAGE_KEY = /^[a-z][a-zA-Z]*(\.[a-zA-Z]+)+$/;

/** Première erreur de chaque champ (chemin « a.b.0 »), pour l'affichage sous les champs. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) fieldErrors[path] = MESSAGE_KEY.test(issue.message) ? issue.message : "validation.invalid";
  }
  return fieldErrors;
}

export function invalid(error: z.ZodError) {
  return fail("validation.form", zodFieldErrors(error));
}
