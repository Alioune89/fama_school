"use client";

import { useState, useTransition } from "react";
import { Download, FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { deleteStudentDocument, recordStudentDocument } from "@/features/students/document-actions";
import { DOCUMENT_KINDS, type DocumentKind } from "@/features/students/schemas";
import { uploadStudentFile } from "@/features/students/upload";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DocumentItem = {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  url: string | null;
};

type Props = { schoolId: string; studentId: string; documents: DocumentItem[]; canEdit: boolean };

const formatSize = (bytes: number | null) =>
  bytes === null
    ? ""
    : bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
      : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;

/** Dossier de l'élève : extrait de naissance, bulletins précédents, certificats. */
export function StudentDocuments({ schoolId, studentId, documents, canEdit }: Props) {
  const t = useTranslations("students.documents");
  const message = useMessage();
  const [kind, setKind] = useState<DocumentKind>("birth_certificate");
  const [pending, startTransition] = useTransition();

  const upload = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      const uploaded = await uploadStudentFile(file, { schoolId, studentId });
      if ("error" in uploaded) {
        toast.error(t(`errors.${uploaded.error}`));
        return;
      }
      // Une photo réduite devient un .jpg : le nom affiché suit.
      const fileName = uploaded.mimeType === "image/jpeg" ? file.name.replace(/\.[^.]+$/, "") + ".jpg" : file.name;
      const result = await recordStudentDocument({ studentId, kind, fileName: fileName.slice(0, 200), ...uploaded });
      if (result.ok) toast.success(t("added"));
      else toast.error(message(result.error));
    });
  };

  const remove = (document: DocumentItem) => {
    if (!window.confirm(t("removeConfirm", { name: document.fileName }))) return;
    startTransition(async () => {
      const result = await deleteStudentDocument({ documentId: document.id });
      if (result.ok) toast.success(t("removed"));
      else toast.error(message(result.error));
    });
  };

  return (
    <>
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      {documents.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {documents.map((document) => {
            const Icon = document.mimeType?.startsWith("image/") ? ImageIcon : FileText;
            return (
              <li key={document.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-azure-50 text-azure-700" aria-hidden>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {(DOCUMENT_KINDS as readonly string[]).includes(document.kind)
                      ? t(`kinds.${document.kind as DocumentKind}`)
                      : document.fileName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {document.fileName} · {formatSize(document.sizeBytes)} · {formatDate(document.createdAt.slice(0, 10))}
                  </p>
                </div>
                {document.url && (
                  <a
                    href={document.url}
                    className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-azure-50 hover:text-ink"
                    aria-label={t("download", { name: document.fileName })}
                    title={t("download", { name: document.fileName })}
                  >
                    <Download className="size-4" aria-hidden />
                  </a>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    onClick={() => remove(document)}
                    aria-label={t("remove", { name: document.fileName })}
                    title={t("remove", { name: document.fileName })}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-azure-50/60 p-3 sm:flex-row sm:items-center">
          <NativeSelect
            aria-label={t("kind")}
            value={kind}
            onChange={(event) => setKind(event.target.value as DocumentKind)}
            className="sm:flex-1"
          >
            {DOCUMENT_KINDS.map((value) => (
              <option key={value} value={value}>
                {t(`kinds.${value}`)}
              </option>
            ))}
          </NativeSelect>
          <label
            className={cn(
              buttonVariants({ size: "lg" }),
              "cursor-pointer focus-within:ring-3 focus-within:ring-ring/50",
              pending && "pointer-events-none opacity-60",
            )}
          >
            <Upload className="size-4" aria-hidden />
            {pending ? t("uploading") : t("upload")}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              disabled={pending}
              onChange={(event) => {
                upload(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      )}
      {canEdit && <p className="mt-2 text-xs text-muted-foreground">{t("hint")}</p>}
    </>
  );
}
