"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ActionResult, FieldErrors } from "@/lib/action-result";

type MessageKey = Parameters<ReturnType<typeof useTranslations<never>>>[0];

/** Traduit une clé renvoyée par le serveur ; une clé inconnue retombe sur un message générique. */
export function useMessage() {
  const t = useTranslations();
  return (key: string | undefined | null): string | undefined => {
    if (!key) return undefined;
    return t.has(key as MessageKey) ? t(key as MessageKey) : t("errors.unknown");
  };
}

/**
 * Exécute une Server Action typée et expose l'état du formulaire (en attente, erreurs par champ).
 * Avec experimental.useOffline, une action lancée hors ligne reste « en attente » puis repart seule.
 */
export function useActionForm<TInput, TData>(
  action: (input: TInput) => Promise<ActionResult<TData>>,
  options: { onSuccess?: (data: TData) => void } = {},
) {
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const run = (input: TInput) => {
    setFormError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await action(input);
      if (result.ok) {
        options.onSuccess?.(result.data);
        return;
      }
      setFieldErrors(result.fieldErrors ?? {});
      setFormError(result.error);
    });
  };

  return {
    run,
    pending,
    formError: message(formError),
    fieldError: (name: string) => message(fieldErrors[name]),
    hasError: (name: string) => Boolean(fieldErrors[name]),
    /** Une erreur sur ce champ ou l'un de ses sous-champs (« rows.3 » couvre « rows.3.name »). */
    hasErrorUnder: (prefix: string) => Object.keys(fieldErrors).some((path) => path === prefix || path.startsWith(`${prefix}.`)),
  };
}

/**
 * Envoi d'un formulaire à champs non contrôlés, sans la remise à zéro automatique de React 19
 * (`<form action>` vide tous les champs après chaque envoi, même refusé : la saisie serait perdue).
 * Usage : `<form onSubmit={submitForm((formData) => …)}>`.
 */
export function submitForm(handler: (formData: FormData) => void) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
  };
}
