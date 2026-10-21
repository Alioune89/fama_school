"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { addStaffMember, updateStaffMember } from "@/features/staff/actions";
import type { SchoolCycle } from "@/features/staff/queries";
import { useRouter } from "@/i18n/navigation";
import type { AppRole } from "@/lib/auth/spaces";
import { suggestedTeacherTitle } from "@/lib/domain/teaching";
import { formatPhone } from "@/lib/phone";
import type { Enums } from "@/lib/supabase/database.types";

type Member = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  title: string | null;
  contract: Enums<"staff_contract"> | null;
  sex: Enums<"sex"> | null;
  cycle: Enums<"cycle_code"> | null;
};

type Props = {
  /** « teacher » : formulaire professeur (contrat) ; sinon choix du rôle parmi roleOptions. */
  kind: "teacher" | "staff";
  roleOptions?: AppRole[];
  /** Cycles de l'école (enseignants : cycle d'enseignement). */
  cycles?: SchoolCycle[];
  member?: Member;
  trigger: ReactNode;
};

export function StaffFormSheet({ kind, roleOptions = [], cycles = [], member, trigger }: Props) {
  const t = useTranslations("staff");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Titre proposé selon le cycle et le genre (Institutrice, Éducateur…), tant qu'il n'est pas saisi à la main.
  const [sex, setSex] = useState<Enums<"sex"> | "">(member?.sex ?? "");
  const [cycle, setCycle] = useState<Enums<"cycle_code"> | "">(member?.cycle ?? "");
  const [title, setTitle] = useState(member?.title ?? "");
  const [titleEdited, setTitleEdited] = useState(Boolean(member?.title));
  const suggestion = kind === "teacher" ? suggestedTeacherTitle(cycle || null, sex || null) : null;
  const shownTitle = titleEdited ? title : (suggestion ?? title);

  const add = useActionForm(addStaffMember, {
    onSuccess: ({ id }) => {
      toast.success(t("form.added"));
      setOpen(false);
      router.push(kind === "teacher" ? `/direction/professeurs/${id}` : `/direction/personnel/${id}`);
    },
  });
  const update = useActionForm(updateStaffMember, {
    onSuccess: () => {
      toast.success(t("form.updated"));
      setOpen(false);
    },
  });
  const form = member ? update : add;

  const submit = (formData: FormData) => {
    const common = {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      title: String(formData.get("title") ?? ""),
      contract:
        kind === "teacher" ? ((String(formData.get("contract") ?? "permanent") as Enums<"staff_contract">) ?? null) : null,
      sex: sex || null,
      cycle: kind === "teacher" ? cycle || null : null,
    };
    if (member) update.run({ id: member.id, ...common });
    else add.run({ ...common, role: kind === "teacher" ? "teacher" : (String(formData.get("role")) as AppRole) });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger as React.ReactElement} />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">
            {member ? t("form.editTitle") : kind === "teacher" ? t("form.addTeacher") : t("form.addStaff")}
          </SheetTitle>
          <SheetDescription>{member ? t("form.editHint") : t("form.inviteHint")}</SheetDescription>
        </SheetHeader>
        <form onSubmit={submitForm(submit)} noValidate className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {kind === "staff" && !member && (
            <Field>
              <FieldLabel htmlFor="role">{t("form.role")}</FieldLabel>
              <NativeSelect id="role" name="role" defaultValue={roleOptions[0]}>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {tRoles(role)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field data-invalid={form.hasError("fullName") || undefined}>
            <FieldLabel htmlFor="fullName">{t("form.fullName")}</FieldLabel>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={member?.fullName}
              required
              autoComplete="off"
              aria-invalid={form.hasError("fullName") || undefined}
            />
            <FieldError>{form.fieldError("fullName")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("phone") || undefined}>
            <FieldLabel htmlFor="phone">{t("form.phone")}</FieldLabel>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="77 123 45 67"
              defaultValue={formatPhone(member?.phone)}
              aria-invalid={form.hasError("phone") || undefined}
            />
            <FieldDescription>{t("form.phoneHint")}</FieldDescription>
            <FieldError>{form.fieldError("phone")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("email") || undefined}>
            <FieldLabel htmlFor="email">{t("form.email")}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              defaultValue={member?.email ?? ""}
              aria-invalid={form.hasError("email") || undefined}
            />
            <FieldError>{form.fieldError("email")}</FieldError>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sex">{t("form.sex")}</FieldLabel>
              <NativeSelect id="sex" value={sex} onChange={(event) => setSex(event.target.value as Enums<"sex"> | "")}>
                <option value="">{t("form.notSpecified")}</option>
                <option value="F">{t("form.sexF")}</option>
                <option value="M">{t("form.sexM")}</option>
              </NativeSelect>
            </Field>
            {kind === "teacher" && (
              <Field>
                <FieldLabel htmlFor="cycle">{t("form.cycle")}</FieldLabel>
                <NativeSelect
                  id="cycle"
                  value={cycle}
                  onChange={(event) => setCycle(event.target.value as Enums<"cycle_code"> | "")}
                >
                  <option value="">{t("form.notSpecified")}</option>
                  {cycles.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
          <Field>
            <FieldLabel htmlFor="title">{t("form.title")}</FieldLabel>
            <Input
              id="title"
              name="title"
              value={shownTitle}
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleEdited(true);
              }}
              placeholder={kind === "teacher" ? t("form.titlePlaceholderTeacher") : t("form.titlePlaceholderStaff")}
            />
            {kind === "teacher" &&
              (suggestion && titleEdited && title !== suggestion ? (
                <FieldDescription>
                  <button
                    type="button"
                    className="font-medium text-azure-700 underline-offset-2 hover:underline"
                    onClick={() => {
                      setTitle(suggestion);
                      setTitleEdited(false);
                    }}
                  >
                    {t("form.useSuggestion", { title: suggestion })}
                  </button>
                </FieldDescription>
              ) : (
                <FieldDescription>{t("form.titleHint")}</FieldDescription>
              ))}
          </Field>
          {kind === "teacher" && (
            <Field>
              <FieldLabel htmlFor="contract">{t("form.contract")}</FieldLabel>
              <NativeSelect id="contract" name="contract" defaultValue={member?.contract ?? "permanent"}>
                <option value="permanent">{t("contracts.permanent")}</option>
                <option value="vacataire">{t("contracts.vacataire")}</option>
              </NativeSelect>
            </Field>
          )}
          <FormAlert message={form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending}>
              {member ? t("form.save") : t("form.add")}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => setOpen(false)}>
              {t("form.cancel")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
