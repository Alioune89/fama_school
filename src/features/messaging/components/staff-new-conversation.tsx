"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, SquarePen } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { loadParentContacts, startConversation } from "../actions";
import type { StudentOption } from "../queries";

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Le personnel écrit au parent d'un élève : le professeur parle en son nom (`teacherId`), la direction au nom de
 * la boîte « Direction » (`teacherId` null).
 */
export function StaffNewConversation({
  students,
  teacherId,
  basePath,
}: {
  students: StudentOption[];
  teacherId: string | null;
  basePath: string;
}) {
  const t = useTranslations("messages");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [parents, setParents] = useState<{ userId: string; name: string }[] | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, startLoading] = useTransition();
  const form = useActionForm(startConversation, {
    onSuccess: ({ id }) => {
      setOpen(false);
      router.push(`${basePath}/${id}`);
    },
  });

  const matches = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return students.filter((s) => words.every((word) => normalize(`${s.name} ${s.className ?? ""}`).includes(word))).slice(0, 12);
  }, [students, query]);

  function choose(option: StudentOption) {
    setStudent(option);
    setParents(null);
    setParentId(null);
    startLoading(async () => {
      const result = await loadParentContacts(option.id);
      const list = result.ok ? result.data : [];
      setParents(list);
      setParentId(list[0]?.userId ?? null);
    });
  }

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
          <SheetDescription>{t(teacherId ? "newHintTeacher" : "newHintDirection")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.run({ studentId: student?.id ?? "", parentId: parentId ?? undefined, teacherId, subject, body });
          }}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <Field data-invalid={form.hasError("studentId") || undefined}>
            <FieldLabel htmlFor="message-student">{t("student")}</FieldLabel>
            {student ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-azure-50 px-3 py-2.5 ring-1 ring-azure-500">
                <span className="text-sm font-semibold text-ink">
                  {student.name}
                  {student.className && <span className="font-normal text-ink-soft"> · {student.className}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setStudent(null)}
                  className="text-xs font-semibold text-azure-700 hover:underline"
                >
                  {t("changeStudent")}
                </button>
              </div>
            ) : (
              <>
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="message-student"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("studentPlaceholder")}
                    className="pl-9"
                    autoComplete="off"
                  />
                </label>
                {matches.length > 0 && (
                  <ul className="mt-1 divide-y divide-line rounded-lg ring-1 ring-line" aria-label={t("studentResults")}>
                    {matches.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => choose(option)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50"
                        >
                          <span className="font-medium text-ink">{option.name}</span>
                          <span className="text-xs text-muted-foreground">{option.className}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <FieldError>{form.fieldError("studentId")}</FieldError>
          </Field>
          {student && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("parent")}</legend>
              {loading || parents === null ? (
                <p className="text-sm text-muted-foreground">{t("loadingParents")}</p>
              ) : parents.length === 0 ? (
                <p className="rounded-lg bg-sun-100 px-3 py-2 text-sm text-ink">{t("noParentAccount")}</p>
              ) : (
                <div role="radiogroup" aria-label={t("parent")} className="grid gap-2">
                  {parents.map((parent) => (
                    <button
                      key={parent.userId}
                      type="button"
                      role="radio"
                      aria-checked={parentId === parent.userId}
                      onClick={() => setParentId(parent.userId)}
                      className={cn(
                        "rounded-xl px-3 py-2.5 text-left text-sm font-medium ring-1",
                        parentId === parent.userId ? "bg-azure-50 ring-2 ring-azure-500" : "bg-white ring-line",
                      )}
                    >
                      {parent.name}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
          )}
          <Field data-invalid={form.hasError("subject") || undefined}>
            <FieldLabel htmlFor="staff-message-subject">{t("subject")}</FieldLabel>
            <Input
              id="staff-message-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={120}
              autoComplete="off"
              aria-invalid={form.hasError("subject") || undefined}
            />
            <FieldError>{form.fieldError("subject")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("body") || undefined}>
            <FieldLabel htmlFor="staff-message-body">{t("message")}</FieldLabel>
            <Textarea
              id="staff-message-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={6}
              maxLength={2000}
              aria-invalid={form.hasError("body") || undefined}
            />
            <FieldError>{form.fieldError("body")}</FieldError>
          </Field>
          <FormAlert message={form.fieldError("parentId") ?? form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending || !parentId}>
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
