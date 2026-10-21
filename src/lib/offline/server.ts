import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { operationSchema, type Operation, type OperationKind, type OperationOutcome } from "./operations";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Une fonction par type d'opération : elle appelle la fonction SQL idempotente correspondante. */
export type SyncHandlers = {
  [K in OperationKind]: (supabase: Supabase, op: Extract<Operation, { kind: K }>) => Promise<OperationOutcome>;
};

/**
 * Traduit une erreur Postgres en issue d'opération. Les refus définitifs (droits, données invalides)
 * sont montrés à l'utilisateur ; le reste (réseau, base indisponible) sera retenté.
 */
export function operationError(
  id: string,
  error: { code?: string; message?: string },
  namespace: string,
  codes: readonly string[],
): OperationOutcome {
  if (error.code === "P0001") {
    if (error.message === "forbidden") return { id, status: "rejected", error: "errors.forbidden" };
    if (codes.includes(error.message ?? "")) return { id, status: "rejected", error: `${namespace}.${error.message}` };
    return { id, status: "rejected", error: "errors.unknown" };
  }
  if (error.code === "42501") return { id, status: "rejected", error: "errors.forbidden" };
  // Données refusées par la base (format, contrainte, élément supprimé) : un nouvel essai n'y changerait rien.
  if (error.code?.startsWith("22") || error.code?.startsWith("23")) return { id, status: "rejected", error: "errors.unknown" };
  return { id, status: "retry" };
}

/** Applique les opérations dans l'ordre d'enregistrement (une correction suit l'appel qu'elle corrige). */
export async function applyOperations(supabase: Supabase, operations: unknown[], handlers: SyncHandlers) {
  const results: OperationOutcome[] = [];
  for (const raw of operations) {
    const parsed = operationSchema.safeParse(raw);
    if (!parsed.success) {
      const id = typeof raw === "object" && raw !== null && "id" in raw ? String(raw.id) : "";
      results.push({ id, status: "rejected", error: "validation.invalid" });
      continue;
    }
    const op = parsed.data;
    const handler = handlers[op.kind] as (supabase: Supabase, op: Operation) => Promise<OperationOutcome>;
    try {
      results.push(await handler(supabase, op));
    } catch {
      results.push({ id: op.id, status: "retry" });
    }
  }
  return results;
}
