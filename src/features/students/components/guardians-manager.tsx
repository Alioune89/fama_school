"use client";

import { useState, useTransition } from "react";
import { Pencil, Phone, Plus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { StatusPill } from "@/components/dashboard/status-pill";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm, useMessage } from "@/components/forms/use-action-form";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { addGuardian, removeGuardian, setPrimaryGuardian, updateGuardian } from "@/features/students/guardian-actions";
import { RELATIONSHIPS, type Relationship } from "@/features/students/schemas";
import { formatPhone } from "@/lib/phone";

export type GuardianItem = {
  id: string;
  full_name: string;
  phone: string | null;
  profession: string | null;
  user_id: string | null;
  relationship: Relationship;
  isPrimary: boolean;
};

type Props = { studentId: string; guardians: GuardianItem[]; canEdit: boolean };

export function GuardiansManager({ studentId, guardians, canEdit }: Props) {
  const t = useTranslations("students");
  const message = useMessage();
  const [pending, startTransition] = useTransition();

  const makePrimary = (guardian: GuardianItem) =>
    startTransition(async () => {
      const result = await setPrimaryGuardian({ studentId, guardianId: guardian.id });
      if (result.ok) toast.success(t("guardians.primarySet", { name: guardian.full_name }));
      else toast.error(message(result.error));
    });

  const remove = (guardian: GuardianItem) => {
    if (!window.confirm(t("guardians.removeConfirm", { name: guardian.full_name }))) return;
    startTransition(async () => {
      const result = await removeGuardian({ studentId, guardianId: guardian.id });
      if (result.ok) toast.success(t("guardians.removed"));
      else toast.error(message(result.error));
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("detail.guardians")}</h2>
        {canEdit && guardians.length < 4 && (
          <GuardianDialog
            studentId={studentId}
            trigger={
              <Button variant="outline" size="sm">
                <Plus aria-hidden />
                {t("guardians.add")}
              </Button>
            }
          />
        )}
      </div>
      {guardians.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("detail.noGuardians")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {guardians.map((guardian) => (
            <li key={guardian.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <PersonAvatar name={guardian.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{guardian.full_name}</span>
                      {guardian.isPrimary && (
                        <Star className="size-3.5 shrink-0 fill-sun-300 text-sun-400" aria-label={t("detail.primary")} />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`relationships.${guardian.relationship}`)}
                      {guardian.profession && ` · ${guardian.profession}`}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="-mt-1 flex shrink-0 items-center gap-0.5">
                      {!guardian.isPrimary && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          onClick={() => makePrimary(guardian)}
                          aria-label={t("guardians.makePrimary", { name: guardian.full_name })}
                          title={t("guardians.makePrimary", { name: guardian.full_name })}
                        >
                          <Star aria-hidden />
                        </Button>
                      )}
                      <GuardianDialog
                        studentId={studentId}
                        guardian={guardian}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("guardians.edit", { name: guardian.full_name })}
                            title={t("guardians.edit", { name: guardian.full_name })}
                          >
                            <Pencil aria-hidden />
                          </Button>
                        }
                      />
                      {guardians.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          onClick={() => remove(guardian)}
                          aria-label={t("guardians.remove", { name: guardian.full_name })}
                          title={t("guardians.remove", { name: guardian.full_name })}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {guardian.phone && (
                    <a
                      href={`tel:${guardian.phone}`}
                      className="tabular inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
                    >
                      <Phone className="size-4" aria-hidden />
                      {formatPhone(guardian.phone)}
                    </a>
                  )}
                  {guardian.user_id ? (
                    <StatusPill tone="success">{t("detail.parentConnected")}</StatusPill>
                  ) : guardian.phone ? (
                    <StatusPill tone="warning">{t("detail.parentInvited")}</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">{t("detail.parentNoPhone")}</StatusPill>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 rounded-lg bg-azure-50 px-3 py-2 text-xs text-ink-soft">{t("detail.parentAccessHint")}</p>
    </>
  );
}

/** Ajout (sans parent) ou modification d'un parent. */
function GuardianDialog({
  studentId,
  guardian,
  trigger,
}: {
  studentId: string;
  guardian?: GuardianItem;
  trigger: React.ReactElement;
}) {
  const t = useTranslations("students");
  const [open, setOpen] = useState(false);
  const onSuccess = () => {
    toast.success(guardian ? t("guardians.updated") : t("guardians.added"));
    setOpen(false);
  };
  const add = useActionForm(addGuardian, { onSuccess });
  const update = useActionForm(updateGuardian, { onSuccess });
  const form = guardian ? update : add;
  const phoneLocked = Boolean(guardian?.user_id);

  const submit = (formData: FormData) => {
    const common = {
      studentId,
      fullName: String(formData.get("fullName") ?? ""),
      phone: phoneLocked ? (guardian?.phone ?? "") : String(formData.get("phone") ?? ""),
      relationship: String(formData.get("relationship") ?? "") as Relationship,
    };
    if (guardian) update.run({ ...common, guardianId: guardian.id, profession: String(formData.get("profession") ?? "") });
    else add.run({ ...common, isPrimary: formData.get("isPrimary") === "on" });
  };

  const id = (name: string) => `guardian-${guardian?.id ?? "new"}-${name}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {guardian ? t("guardians.editTitle") : t("guardians.addTitle")}
          </DialogTitle>
          <DialogDescription>{guardian ? t("guardians.editHint") : t("guardians.addHint")}</DialogDescription>
        </DialogHeader>
        <form action={submit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={form.hasError("fullName") || undefined}>
            <FieldLabel htmlFor={id("fullName")}>{t("form.guardianName")}</FieldLabel>
            <Input id={id("fullName")} name="fullName" defaultValue={guardian?.full_name} autoComplete="off" required />
            <FieldError>{form.fieldError("fullName")}</FieldError>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={form.hasError("phone") || undefined}>
              <FieldLabel htmlFor={id("phone")}>{t("form.guardianPhone")}</FieldLabel>
              <Input
                id={id("phone")}
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="77 123 45 67"
                defaultValue={formatPhone(guardian?.phone) || ""}
                disabled={phoneLocked}
              />
              {phoneLocked && <FieldDescription>{t("guardians.phoneLockedHint")}</FieldDescription>}
              <FieldError>{form.fieldError("phone")}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor={id("relationship")}>{t("form.relationship")}</FieldLabel>
              <NativeSelect id={id("relationship")} name="relationship" defaultValue={guardian?.relationship ?? "mother"}>
                {RELATIONSHIPS.map((relationship) => (
                  <option key={relationship} value={relationship}>
                    {t(`relationships.${relationship}`)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {guardian ? (
            <Field>
              <FieldLabel htmlFor={id("profession")}>{t("guardians.profession")}</FieldLabel>
              <Input id={id("profession")} name="profession" defaultValue={guardian.profession ?? ""} autoComplete="off" />
            </Field>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPrimary" className="size-4 accent-lavender-500" />
              {t("guardians.isPrimary")}
            </label>
          )}
          {guardian && <p className="text-xs text-muted-foreground">{t("guardians.sharedHint")}</p>}
          <FormAlert message={form.formError} />
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={form.pending}>
              {guardian ? t("form.save") : t("guardians.addSubmit")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("form.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
