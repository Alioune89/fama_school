import { offlineDb, type OutboxEntry } from "./db";
import { SYNC_BATCH_SIZE, type Operation, type SyncResponse } from "./operations";

/**
 * File d'envoi du téléphone. Une saisie est d'abord enregistrée ici (elle survit à une fermeture
 * de l'appli ou à une coupure de courant), puis envoyée à `POST /api/sync` dès que le réseau le permet.
 */

export type SyncProblem = "offline" | "unauthenticated" | "server";
export type SyncState = { syncing: boolean; problem: SyncProblem | null; lastSyncedAt: string | null };

let state: SyncState = { syncing: false, problem: null, lastSyncedAt: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export const syncStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => state,
};

/** Événement émis après une mise en file : le composant de synchronisation envoie aussitôt. */
export const OUTBOX_EVENT = "fama:outbox";

/**
 * Enregistre une opération. Elle remplace une opération du même élément encore en attente :
 * chaque opération porte l'état complet (tout l'appel), seule la dernière compte.
 */
export async function enqueue(userId: string, operation: Operation, meta: { ref: string; label: string }) {
  const db = offlineDb();
  await db.transaction("rw", db.outbox, async () => {
    await db.outbox
      .where("ref")
      .equals(meta.ref)
      .and((entry) => entry.userId === userId && entry.state === "pending")
      .delete();
    await db.outbox.add({
      id: operation.id,
      userId,
      kind: operation.kind,
      payload: operation.payload,
      ref: meta.ref,
      label: meta.label,
      createdAt: new Date().toISOString(),
      state: "pending",
      attempts: 0,
    });
  });
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

let running: Promise<void> | null = null;

/** Envoie les opérations en attente du compte connecté. Un seul envoi à la fois, même avec plusieurs onglets. */
export function flushOutbox(userId: string): Promise<void> {
  if (!running) {
    const send = navigator.locks
      ? navigator.locks.request("fama-sync", () => sendPending(userId)).then(() => undefined)
      : sendPending(userId);
    running = send.finally(() => {
      running = null;
    });
  }
  return running;
}

async function sendPending(userId: string) {
  const db = offlineDb();
  setState({ syncing: true });
  try {
    for (;;) {
      const batch = (await db.outbox.where("[userId+state]").equals([userId, "pending"]).sortBy("createdAt")).slice(
        0,
        SYNC_BATCH_SIZE,
      );
      if (batch.length === 0) break;

      const problem = await sendBatch(userId, batch);
      if (problem) {
        setState({ problem });
        return;
      }
    }
    setState({ problem: null, lastSyncedAt: new Date().toISOString() });
  } finally {
    setState({ syncing: false });
  }
}

async function sendBatch(userId: string, batch: OutboxEntry[]): Promise<SyncProblem | null> {
  const db = offlineDb();
  let response: Response;
  try {
    response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        operations: batch.map(({ id, kind, payload }) => ({ id, kind, payload })),
      }),
    });
  } catch {
    return "offline";
  }
  // Session expirée, ou autre compte connecté sur ce téléphone : la file attend son propriétaire.
  if (response.status === 401 || response.status === 409) return "unauthenticated";
  if (!response.ok) return "server";

  const { results } = (await response.json()) as SyncResponse;
  let progressed = false;
  await db.transaction("rw", db.outbox, async () => {
    for (const result of results) {
      if (result.status === "retry") {
        await db.outbox
          .where("id")
          .equals(result.id)
          .modify((entry) => void (entry.attempts += 1));
        continue;
      }
      progressed = true;
      if (result.status === "rejected") {
        await db.outbox.update(result.id, { state: "rejected", error: result.error });
      } else {
        await db.outbox.delete(result.id);
      }
    }
  });
  return progressed ? null : "server";
}

/** Retire une opération refusée, après que l'utilisateur l'a vue. */
export async function dismissRejected(id: string) {
  await offlineDb().outbox.delete(id);
}

/** Les saisies locales de plus de deux semaines n'ont plus d'intérêt (un appel ne se rattrape que sur une semaine). */
export async function pruneDrafts() {
  const limit = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  await offlineDb().drafts.where("updatedAt").below(limit).delete();
}
