"use client";

import { shrinkImage } from "@/features/students/upload";
import { createClient } from "@/lib/supabase/client";
import { prepareUploads } from "./actions";
import { ATTACHMENT_MAX_BYTES } from "./schemas";

export type PreparedFile = { name: string; kind: "jpg" | "pdf"; body: Blob };
export type FileError = "unsupported" | "tooLarge";

/** Photo réduite en JPEG (connexions mobiles) ou PDF tel quel ; 3 Mo au plus. */
export async function prepareFile(file: File): Promise<PreparedFile | { error: FileError }> {
  if (file.type === "application/pdf") {
    if (file.size > ATTACHMENT_MAX_BYTES) return { error: "tooLarge" };
    return { name: file.name.slice(0, 120), kind: "pdf", body: file };
  }
  if (!file.type.startsWith("image/")) return { error: "unsupported" };
  const body = await shrinkImage(file, 1800);
  if (!body) return { error: "unsupported" };
  if (body.size > ATTACHMENT_MAX_BYTES) return { error: "tooLarge" };
  return { name: file.name.slice(0, 120), kind: "jpg", body };
}

/** Envoie les pièces jointes par des adresses signées ; null si l'un des envois échoue. */
export async function uploadAttachments(slug: string, files: PreparedFile[]): Promise<{ path: string; name: string }[] | null> {
  if (files.length === 0) return [];
  const slots = await prepareUploads({ slug, kinds: files.map((file) => file.kind) });
  if (!slots.ok) return null;
  const storage = createClient().storage.from("preregistrations");
  const pairs = files.map((file, index) => ({ file, slot: slots.data[index]! }));
  const results = await Promise.all(
    pairs.map(({ file, slot }) =>
      storage.uploadToSignedUrl(slot.path, slot.token, file.body, {
        contentType: file.kind === "pdf" ? "application/pdf" : "image/jpeg",
      }),
    ),
  );
  if (results.some((result) => result.error)) return null;
  return pairs.map(({ file, slot }) => ({ path: slot.path, name: file.name }));
}
