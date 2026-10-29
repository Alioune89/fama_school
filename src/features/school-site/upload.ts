"use client";

import { shrinkImage } from "@/features/students/upload";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 3 * 1024 * 1024;

/** Envoie une photo du site dans le stockage public (<école>/<uuid>.jpg), réduite pour les connexions mobiles. */
export async function uploadSitePhoto(
  file: File,
  schoolId: string,
): Promise<{ path: string } | { error: "unsupported" | "tooLarge" | "failed" }> {
  if (!file.type.startsWith("image/")) return { error: "unsupported" };
  const body = await shrinkImage(file, 1600);
  if (!body) return { error: "unsupported" };
  if (body.size > MAX_BYTES) return { error: "tooLarge" };
  const path = `${schoolId}/${crypto.randomUUID()}.jpg`;
  const { error } = await createClient()
    .storage.from("school-sites")
    .upload(path, body, { contentType: "image/jpeg", upsert: false });
  if (error) return { error: "failed" };
  return { path };
}
