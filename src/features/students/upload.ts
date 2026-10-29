"use client";

import { createClient } from "@/lib/supabase/client";
import { DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES } from "./schemas";

/** Buckets privés rangés par élève : dossier scolaire, justificatifs d'absence envoyés par les parents. */
type StudentBucket = "student-documents" | "absence-justifications";

type UploadedFile = { path: string; mimeType: (typeof DOCUMENT_MIME_TYPES)[number]; sizeBytes: number };

export type UploadError = "unsupported" | "tooLarge" | "failed";

/**
 * Réduit une photo de téléphone (souvent 3 à 8 Mo, parfois en HEIC) en JPEG léger :
 * moins de données mobiles et un format accepté par le stockage.
 */
export async function shrinkImage(file: File, maxSide: number): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

/** Envoie un fichier dans le dossier privé de l'élève (<école>/<élève>/<uuid>.<ext>). */
export async function uploadStudentFile(
  file: File,
  {
    schoolId,
    studentId,
    maxImageSide = 2000,
    bucket = "student-documents",
  }: { schoolId: string; studentId: string; maxImageSide?: number; bucket?: StudentBucket },
): Promise<UploadedFile | { error: UploadError }> {
  let body: Blob = file;
  let mimeType = file.type;

  if (file.type.startsWith("image/")) {
    const shrunk = await shrinkImage(file, maxImageSide);
    if (shrunk) {
      body = shrunk;
      mimeType = "image/jpeg";
    }
  }
  if (!(DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)) return { error: "unsupported" };
  if (body.size > DOCUMENT_MAX_BYTES) return { error: "tooLarge" };

  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[mimeType]!;
  const path = `${schoolId}/${studentId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await createClient().storage.from(bucket).upload(path, body, { contentType: mimeType, upsert: false });
  if (error) return { error: "failed" };
  return { path, mimeType: mimeType as UploadedFile["mimeType"], sizeBytes: body.size };
}
