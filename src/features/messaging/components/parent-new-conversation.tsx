"use client";

import { useState } from "react";
import { Clock, SquarePen } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { startConversation } from "../actions";
import { isAvailableNow } from "../availability";
import type { TeacherContact } from "../queries";
import { useAvailabilityText } from "./use-availability-text";

type Child = { id: string; name: string; teachers: TeacherContact[] };

/** Le parent écrit au professeur d'un de ses enfants ou à la direction. */
export function ParentNewConversation({ childrenOptions }: { childrenOptions: Child[] }) {
  const t = useTranslations("messages");
  const router = useRouter();
  const availabilityText = useAvailabilityText();
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState(childrenOptions[0]?.id ?? "");
  const [recipient, setRecipient] = useState("direction");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const child = childrenOptions.find((c) => c.id === childId);
  const teacher = child?.teachers.find((c) => c.userId === recipient);
  const form = useActionForm(startConversation, {
    onSuccess: ({ id }) => {
      setOpen(false);
      router.push(`/parent/messages/${id}`);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button>
            <SquarePen aria-hidden />
            {t("new")}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{t("new")}</SheetTitle>
          <SheetDescription>{t("newHintParent")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.run({ studentId: childId, teacherId: recipient === "direction" ? null : recipient, subject, body });
          }}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {childrenOptions.length > 1 && (
            <Field>
              <FieldLabel htmlFor="message-child">{t("child")}</FieldLabel>
              <NativeSelect
                id="message-child"
                value={childId}
                onChange={(event) => {
                  setChildId(event.target.value);
                  setRecipient("direction");
                }}
              >
                {childrenOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="message-recipient">{t("recipient")}</FieldLabel>
            <NativeSelect id="message-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)}>
              <option value="direction">{t("directionOption")}</option>
              {child?.teachers.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.homeroom
                    ? t("teacherHomeroom", { name: c.name })
                    : t("teacherOption", { name: c.name, subjects: c.subjects.join(", ") })}
                </option>
              ))}
            </NativeSelect>
            {teacher && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-soft">
                <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  {availabilityText(teacher.availability)}
                  {!isAvailableNow(teacher.availability) && ` ${t("availability.later")}`}
                </span>
              </p>
            )}
          </Field>
          <Field data-invalid={form.hasError("subject") || undefined}>
            <FieldLabel htmlFor="message-subject">{t("subject")}</FieldLabel>
            <Input
              id="message-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={120}
              autoComplete="off"
              placeholder={t("subjectPlaceholder")}
              aria-invalid={form.hasError("subject") || undefined}
            />
            <FieldError>{form.fieldError("subject")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("body") || undefined}>
            <FieldLabel htmlFor="message-body">{t("message")}</FieldLabel>
            <Textarea
              id="message-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={6}
              maxLength={2000}
              aria-invalid={form.hasError("body") || undefined}
            />
            <FieldError>{form.fieldError("body")}</FieldError>
          </Field>
          <FormAlert message={form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending}>
              {t("send")}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
