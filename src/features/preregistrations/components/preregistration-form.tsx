"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm, useMessage } from "@/components/forms/use-action-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RELATIONSHIPS } from "@/features/students/schemas";
import { submitPreregistration } from "../actions";
import type { LevelOption } from "../queries";
import { ATTACHMENT_LIMIT, type PreregistrationInput } from "../schemas";
import { prepareFile, uploadAttachments, type PreparedFile } from "../upload";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

const submitClass =
  "inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent)] px-6 font-semibold text-white disabled:opacity-60 sm:w-auto";

/** Formulaire de pré-inscription du site vitrine : l'enfant, le parent, les pièces jointes. */
export function PreregistrationForm({ slug, schoolName, levels }: { slug: string; schoolName: string; levels: LevelOption[] }) {
  const t = useTranslations("preregistrations.form");
  const tSex = useTranslations("students.sex");
  const tRelationship = useTranslations("students.relationships");
  const message = useMessage();
  const [reference, setReference] = useState<string | null>(null);
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  // Pièces déjà envoyées : un nouvel essai après une erreur de saisie ne les renvoie pas.
  const [uploaded, setUploaded] = useState<{ path: string; name: string }[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const form = useActionForm(submitPreregistration, { onSuccess: (data) => setReference(data.reference) });

  if (reference) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
        <CheckCircle2 className="size-10 text-success-500" aria-hidden />
        <h2 className="text-xl font-bold">{t("successTitle")}</h2>
        <p className="text-ink-soft">{t("successBody", { school: schoolName })}</p>
        <p className="rounded-lg bg-azure-50 px-4 py-3 text-sm">
          {t("reference")} <strong className="tabular-nums">{reference}</strong>
        </p>
      </div>
    );
  }

  const cycles = [...new Set(levels.map((level) => level.cycle))];
  const field = (name: string) => ({ id: `pre-${name}`, name, "aria-invalid": form.hasError(name) || undefined });

  async function addFiles(list: FileList | null) {
    setFileError(null);
    const picked = [...(list ?? [])].slice(0, ATTACHMENT_LIMIT - files.length);
    const prepared: PreparedFile[] = [];
    for (const file of picked) {
      const result = await prepareFile(file);
      if ("error" in result) setFileError(t(`fileErrors.${result.error}`, { name: file.name }));
      else prepared.push(result);
    }
    setFiles((current) => [...current, ...prepared]);
    setUploaded(null);
  }

  async function submit(formData: FormData) {
    let attachments = uploaded;
    if (!attachments) {
      setUploading(true);
      attachments = await uploadAttachments(slug, files);
      setUploading(false);
      if (!attachments) {
        setFileError(message("preregistrations.errors.uploadFailed") ?? null);
        return;
      }
      setUploaded(attachments);
    }
    form.run({
      slug,
      levelId: text(formData, "levelId"),
      childFirstName: text(formData, "childFirstName"),
      childLastName: text(formData, "childLastName"),
      childSex: text(formData, "childSex") as PreregistrationInput["childSex"],
      childBirthDate: text(formData, "childBirthDate"),
      previousSchool: text(formData, "previousSchool"),
      guardianName: text(formData, "guardianName"),
      guardianPhone: text(formData, "guardianPhone"),
      guardianRelationship: text(formData, "guardianRelationship") as PreregistrationInput["guardianRelationship"],
      guardianEmail: text(formData, "guardianEmail"),
      message: text(formData, "message"),
      attachments,
      website: text(formData, "website"),
    });
  }

  const busy = uploading || form.pending;

  return (
    <form
      onSubmit={submitForm((formData) => void submit(formData))}
      noValidate
      className="grid gap-8 rounded-2xl bg-white p-5 ring-1 ring-line sm:p-8"
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-lg font-bold">{t("childTitle")}</legend>
        <Field data-invalid={form.hasError("childFirstName") || undefined}>
          <FieldLabel htmlFor="pre-childFirstName">{t("firstName")}</FieldLabel>
          <Input {...field("childFirstName")} autoComplete="off" required />
          <FieldError>{form.fieldError("childFirstName")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("childLastName") || undefined}>
          <FieldLabel htmlFor="pre-childLastName">{t("lastName")}</FieldLabel>
          <Input {...field("childLastName")} autoComplete="off" required />
          <FieldError>{form.fieldError("childLastName")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("childSex") || undefined}>
          <FieldLabel htmlFor="pre-childSex">{t("sex")}</FieldLabel>
          <NativeSelect {...field("childSex")} defaultValue="" required>
            <option value="" disabled>
              {t("choose")}
            </option>
            <option value="F">{tSex("F")}</option>
            <option value="M">{tSex("M")}</option>
          </NativeSelect>
          <FieldError>{form.fieldError("childSex")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("childBirthDate") || undefined}>
          <FieldLabel htmlFor="pre-childBirthDate">{t("birthDate")}</FieldLabel>
          <Input {...field("childBirthDate")} type="date" />
          <FieldError>{form.fieldError("childBirthDate")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("levelId") || undefined}>
          <FieldLabel htmlFor="pre-levelId">{t("level")}</FieldLabel>
          <NativeSelect {...field("levelId")} defaultValue="" required>
            <option value="" disabled>
              {t("choose")}
            </option>
            {cycles.map((cycle) => (
              <optgroup key={cycle} label={cycle}>
                {levels
                  .filter((level) => level.cycle === cycle)
                  .map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </NativeSelect>
          <FieldError>{form.fieldError("levelId")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("previousSchool") || undefined}>
          <FieldLabel htmlFor="pre-previousSchool">{t("previousSchool")}</FieldLabel>
          <Input {...field("previousSchool")} autoComplete="off" />
          <FieldError>{form.fieldError("previousSchool")}</FieldError>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-lg font-bold">{t("guardianTitle")}</legend>
        <Field data-invalid={form.hasError("guardianName") || undefined}>
          <FieldLabel htmlFor="pre-guardianName">{t("guardianName")}</FieldLabel>
          <Input {...field("guardianName")} autoComplete="name" required />
          <FieldError>{form.fieldError("guardianName")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("guardianRelationship") || undefined}>
          <FieldLabel htmlFor="pre-guardianRelationship">{t("relationship")}</FieldLabel>
          <NativeSelect {...field("guardianRelationship")} defaultValue="mother">
            {RELATIONSHIPS.map((relationship) => (
              <option key={relationship} value={relationship}>
                {tRelationship(relationship)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={form.hasError("guardianPhone") || undefined}>
          <FieldLabel htmlFor="pre-guardianPhone">{t("phone")}</FieldLabel>
          <Input {...field("guardianPhone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="77 123 45 67" required />
          <FieldDescription>{t("phoneHint")}</FieldDescription>
          <FieldError>{form.fieldError("guardianPhone")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("guardianEmail") || undefined}>
          <FieldLabel htmlFor="pre-guardianEmail">{t("email")}</FieldLabel>
          <Input {...field("guardianEmail")} type="email" inputMode="email" autoComplete="email" />
          <FieldError>{form.fieldError("guardianEmail")}</FieldError>
        </Field>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-lg font-bold">{t("filesTitle")}</legend>
        <p className="text-sm text-ink-soft">{t("filesHint", { count: ATTACHMENT_LIMIT })}</p>
        {files.length > 0 && (
          <ul className="grid gap-2">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-line">
                <FileText className="size-5 shrink-0 text-ink-soft" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-ink-soft hover:bg-muted"
                  aria-label={t("removeFile", { name: file.name })}
                  onClick={() => {
                    setFiles((current) => current.filter((_, i) => i !== index));
                    setUploaded(null);
                  }}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {files.length < ATTACHMENT_LIMIT && (
          <label className="inline-flex h-11 w-fit cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold ring-1 ring-line hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)]">
            <Paperclip className="size-4" aria-hidden />
            {t("addFile")}
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="sr-only"
              onChange={(event) => {
                void addFiles(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        )}
        {fileError && (
          <p role="alert" className="text-sm text-danger-700">
            {fileError}
          </p>
        )}
      </fieldset>

      <Field data-invalid={form.hasError("message") || undefined}>
        <FieldLabel htmlFor="pre-message">{t("message")}</FieldLabel>
        <Textarea {...field("message")} rows={3} placeholder={t("messagePlaceholder")} />
        <FieldError>{form.fieldError("message")}</FieldError>
      </Field>

      {/* Champ piège : invisible pour les personnes, rempli par les robots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Site web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <FormAlert message={form.formError} />
      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
        <button type="submit" className={submitClass} disabled={busy}>
          {uploading ? t("uploading") : form.pending ? t("sending") : t("submit")}
        </button>
        <p className="text-xs text-muted-foreground">{t("privacy", { school: schoolName })}</p>
      </div>
    </form>
  );
}
