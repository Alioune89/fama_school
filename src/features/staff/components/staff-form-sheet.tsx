"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { addStaffMember, updateStaffMember } from "@/features/staff/actions";
import { useRouter } from "@/i18n/navigation";
import type { AppRole } from "@/lib/auth/spaces";
import { formatPhone } from "@/lib/phone";
import type { Enums } from "@/lib/supabase/database.types";

type Member = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  title: string | null;
  contract: Enums<"staff_contract"> | null;
};

type Props = {
  /** « teacher » : formulaire professeur (contrat) ; sinon choix du rôle parmi roleOptions. */
  kind: "teacher" | "staff";
  roleOptions?: AppRole[];
  member?: Member;
  trigger: ReactNode;
};

export function StaffFormSheet({ kind, roleOptions = [], member, trigger }: Props) {
  const t = useTranslations("staff");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
      contract: kind === "teacher" ? ((String(formData.get("contract") ?? "permanent") as Enums<"staff_contract">) ?? null) : null,
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
        <form action={submit} noValidate className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
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
            <Input id="fullName" name="fullName" defaultValue={member?.fullName} required autoComplete="off" aria-invalid={form.hasError("fullName") || undefined} />
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
            <Input id="email" name="email" type="email" inputMode="email" defaultValue={member?.email ?? ""} aria-invalid={form.hasError("email") || undefined} />
            <FieldError>{form.fieldError("email")}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="title">{t("form.title")}</FieldLabel>
            <Input id="title" name="title" defaultValue={member?.title ?? ""} placeholder={kind === "teacher" ? t("form.titlePlaceholderTeacher") : t("form.titlePlaceholderStaff")} />
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
