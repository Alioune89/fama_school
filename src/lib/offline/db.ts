import { Dexie, type EntityTable } from "dexie";
import type { Operation, OperationKind } from "./operations";

/** Opération en attente d'envoi (ou refusée par le serveur, gardée pour être montrée à l'utilisateur). */
export type OutboxEntry = {
  id: string;
  userId: string;
  kind: OperationKind;
  payload: Operation["payload"];
  /** Élément concerné (« rollCall:<classe>:<date>:<créneau> ») : la page affiche son état d'envoi. */
  ref: string;
  /** Libellé lisible (« Appel de 6e A, matin du 21 oct. ») pour la liste des envois. */
  label: string;
  createdAt: string;
  state: "pending" | "rejected";
  attempts: number;
  error?: string;
};

/** Saisie en cours sur le téléphone (un appel pas encore validé, ou validé mais pas encore envoyé). */
export type Draft = {
  key: string;
  userId: string;
  data: unknown;
  updatedAt: string;
};

class OfflineDb extends Dexie {
  outbox!: EntityTable<OutboxEntry, "id">;
  drafts!: EntityTable<Draft, "key">;

  constructor() {
    super("fama-offline");
    this.version(1).stores({
      outbox: "id, [userId+state], ref, createdAt",
      drafts: "key, userId, updatedAt",
    });
  }
}

let instance: OfflineDb | null = null;

/** Base locale du téléphone (IndexedDB), ouverte à la première utilisation, jamais côté serveur. */
export function offlineDb(): OfflineDb {
  instance ??= new OfflineDb();
  return instance;
}
