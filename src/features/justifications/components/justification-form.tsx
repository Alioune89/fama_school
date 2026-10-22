"use client";

import { useEffect, useState, useTransition } from "react";
import { Camera, FileText, HeartPulse, House, MessageSquareText, Stethoscope, WifiOff, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadStudentFile } from "@/features/students/upload";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { submitAbsenceJustification } from "../actions";
import { periodError } from "../period";
import { JUSTIFICATION_BUCKET, JUSTIFICATION_COMMENT_MAX, JUSTIFICATION_REASONS, type JustificationReason } from "../schemas";

const ICONS: Record<JustificationReason, LucideIcon> = {
  illness: HeartPulse,
  medical: Stethoscope,
  family: House,
  other: MessageSquareText,
};

type Props = {
  studentId: string;
  schoolId: string;
  defaultDate: string;
  today: string;
  minDate: string;
  maxDate: string;
};

/**
 * Justificatif envoyé par le parent : période, motif, explication et photo du mot ou du certificat.
 * La photo est réduite sur le téléphone, déposée dans le stockage privé, puis le justificatif est enregistré.
 */
export function JustificationForm({ studentId, schoolId, defaultDate, today, minDate, maxDate }: Props) {
  const t = useTranslations("justifications");
  const message = useMessage();
  const router = useRouter();
  const isOffline = useOffline();
  const [pending, startTransition] = useTransition();

  const [from, setFrom] = useState(defaultDate);
  const [to, setTo] = useState(defaultDate);
  const [reason, setReason] = useState<JustificationReason | null>(null);
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<{ file: File; preview: string | null } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const preview = file?.preview;
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [file]);

  const chooseFile = (chosen: File | undefined) => {
    if (!chosen) return;
    setFile({ file: chosen, preview: chosen.type.startsWith("image/") ? URL.createObjectURL(chosen) : null });
    setErrors((previous) => {
      const next = { ...previous };
      delete next.file;
      delete next.comment;
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const fieldErrors: Record<string, string> = {};
    const dates = periodError(from, to, today);
    if (!from) fieldErrors.from = "validation.invalidDate";
    else if (!to) fieldErrors.to = "validation.invalidDate";
    else if (dates) fieldErrors[dates === "justifications.errors.tooOld" ? "from" : "to"] = dates;
    if (!reason) fieldErrors.reason = "justifications.form.chooseReason";
    if (!file && !comment.trim()) fieldErrors.comment = "justifications.errors.missingProof";
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0 || !reason) return;

    startTransition(async () => {
      let stored: { path: string; mimeType: "image/png" | "image/jpeg" | "image/webp" | "application/pdf" } | null = null;
      if (file) {
        const uploaded = await uploadStudentFile(file.file, {
          schoolId,
          studentId,
          maxImageSide: 1600,
          bucket: JUSTIFICATION_BUCKET,
        });
        if ("error" in uploaded) {
          setErrors({ file: `justifications.errors.${uploaded.error}` });
          return;
        }
        stored = { path: uploaded.path, mimeType: uploaded.mimeType };
      }
      const result = await submitAbsenceJustification({ studentId, from, to, reason, comment, file: stored });
      if (result.ok) {
        toast.success(t("form.sent"));
        router.push(`/parent/enfants/${studentId}`);
        return;
      }
      if (result.fieldErrors) setErrors(result.fieldErrors);
      else toast.error(message(result.error));
    });
  };

  const error = (key: string) => (errors[key] ? message(errors[key]) : null);

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {isOffline && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl bg-warning-50 px-4 py-3 text-sm font-medium text-warning-700"
        >
          <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("form.offline")}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={errors.from ? true : undefined}>
          <FieldLabel htmlFor="justification-from">{t("form.from")}</FieldLabel>
          <Input
            id="justification-from"
            type="date"
            value={from}
            min={minDate}
            max={maxDate}
            onChange={(event) => {
              const value = event.target.value;
              setFrom(value);
              if (value && (!to || to < value)) setTo(value);
            }}
            aria-invalid={errors.from ? true : undefined}
          />
          <FieldError>{error("from")}</FieldError>
        </Field>
        <Field data-invalid={errors.to ? true : undefined}>
          <FieldLabel htmlFor="justification-to">{t("form.to")}</FieldLabel>
          <Input
            id="justification-to"
            type="date"
            value={to}
            min={from || minDate}
            max={maxDate}
            onChange={(event) => setTo(event.target.value)}
            aria-invalid={errors.to ? true : undefined}
          />
          <FieldError>{error("to")}</FieldError>
        </Field>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">{t("form.periodHint")}</p>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("form.reason")}</legend>
        <div role="radiogroup" aria-label={t("form.reason")} className="flex flex-wrap gap-2">
          {JUSTIFICATION_REASONS.map((value) => {
            const Icon = ICONS[value];
            const selected = reason === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setReason(value)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
                  selected ? "bg-azure-100 text-ink ring-azure-500" : "bg-white text-ink-soft ring-line hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t(`reasons.${value}`)}
              </button>
            );
          })}
        </div>
        {errors.reason && <p className="mt-2 text-sm text-destructive">{error("reason")}</p>}
      </fieldset>

      <Field data-invalid={errors.file ? true : undefined}>
        <span className="text-sm font-medium">{t("form.photo")}</span>
        {file && (
          <div className="flex items-center gap-3 rounded-xl bg-azure-50/60 p-3">
            {file.preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) avant l'envoi
              <img src={file.preview} alt={t("form.photo")} className="size-20 rounded-lg object-cover ring-1 ring-line" />
            ) : (
              <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                <FileText className="size-5 shrink-0 text-azure-700" aria-hidden />
                <span className="truncate">{t("form.pdfSelected", { name: file.file.name })}</span>
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setFile(null)} disabled={pending}>
              <X aria-hidden />
              {t("form.removePhoto")}
            </Button>
          </div>
        )}
        <label
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full cursor-pointer focus-within:ring-3 focus-within:ring-ring/50 sm:w-auto",
            pending && "pointer-events-none opacity-60",
          )}
        >
          <Camera className="size-4" aria-hidden />
          {file ? t("form.changePhoto") : t("form.takePhoto")}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            disabled={pending}
            onChange={(event) => {
              chooseFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <FieldDescription>{t("form.photoHint")}</FieldDescription>
        <FieldError>{error("file")}</FieldError>
      </Field>

      <Field data-invalid={errors.comment ? true : undefined}>
        <FieldLabel htmlFor="justification-comment">{t("form.comment")}</FieldLabel>
        <Textarea
          id="justification-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={JUSTIFICATION_COMMENT_MAX}
          rows={3}
          placeholder={t("form.commentPlaceholder")}
          aria-invalid={errors.comment ? true : undefined}
        />
        <FieldDescription>
          {comment.length}/{JUSTIFICATION_COMMENT_MAX}
        </FieldDescription>
        <FieldError>{error("comment")}</FieldError>
      </Field>

      <Button type="submit" size="touch" disabled={pending || isOffline} className="w-full sm:w-auto">
        {pending ? t("form.sending") : t("form.submit")}
      </Button>
    </form>
  );
}
