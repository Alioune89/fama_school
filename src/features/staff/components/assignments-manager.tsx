"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useActionForm, useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { assignTeaching, removeTeaching, setHomeroom } from "@/features/staff/actions";
import type { StaffMemberDetail } from "@/features/staff/queries";

type Props = {
  staffId: string;
  assignments: StaffMemberDetail["assignments"];
  homeroomClasses: StaffMemberDetail["homeroomClasses"];
  options: StaffMemberDetail["options"];
  canEdit: boolean;
};

export function AssignmentsManager({ staffId, assignments, homeroomClasses, options, canEdit }: Props) {
  const t = useTranslations("staff.assignments");
  const message = useMessage();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [pending, startTransition] = useTransition();

  const assign = useActionForm(assignTeaching, {
    onSuccess: () => {
      toast.success(t("assigned"));
      setSubjectId("");
    },
  });

  const selectedClass = options.find((option) => option.id === classId);
  const mine = new Set(assignments.map((a) => `${a.classId}:${a.subjectId}`));

  const remove = (assignmentId: string) =>
    startTransition(async () => {
      const result = await removeTeaching({ assignmentId });
      if (!result.ok) toast.error(message(result.error));
    });

  const toggleHomeroom = (targetClassId: string, set: boolean) =>
    startTransition(async () => {
      const result = await setHomeroom({ classId: targetClassId, staffId: set ? staffId : null });
      if (result.ok) toast.success(set ? t("homeroomSet") : t("homeroomRemoved"));
      else toast.error(message(result.error));
    });

  const byClass = new Map<string, typeof assignments>();
  for (const assignment of assignments) byClass.set(assignment.className, [...(byClass.get(assignment.className) ?? []), assignment]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        {assignments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {[...byClass.entries()].map(([className, items]) => (
              <li key={className} className="rounded-xl bg-canvas p-3">
                <p className="text-sm font-bold text-ink">{className}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {items.map((item) => (
                    <li key={item.id} className="inline-flex items-center gap-1 rounded-full bg-white py-1 pr-1 pl-3 text-sm font-medium text-ink ring-1 ring-line">
                      {item.subjectName}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          disabled={pending}
                          className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-danger-50 hover:text-danger-700"
                          aria-label={t("remove", { subject: item.subjectName, className })}
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <form
            className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            action={() => assign.run({ staffId, classId, subjectId })}
          >
            <Field>
              <FieldLabel htmlFor="assign-class">{t("class")}</FieldLabel>
              <NativeSelect id="assign-class" value={classId} onChange={(event) => { setClassId(event.target.value); setSubjectId(""); }}>
                <option value="">{t("chooseClass")}</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="assign-subject">{t("subject")}</FieldLabel>
              <NativeSelect id="assign-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={!selectedClass}>
                <option value="">{t("chooseSubject")}</option>
                {selectedClass?.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id} disabled={mine.has(`${selectedClass.id}:${subject.id}`)}>
                    {subject.takenBy && !mine.has(`${selectedClass.id}:${subject.id}`) ? t("takenBy", { subject: subject.name, name: subject.takenBy }) : subject.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Button type="submit" disabled={!classId || !subjectId || assign.pending}>
              <Plus aria-hidden />
              {t("assign")}
            </Button>
            {assign.formError && <p role="alert" className="text-sm text-destructive sm:col-span-3">{assign.formError}</p>}
          </form>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <h2 className="text-base font-semibold">{t("homeroomTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("homeroomHint")}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {homeroomClasses.length === 0 && <li className="text-sm text-muted-foreground">{t("homeroomNone")}</li>}
          {homeroomClasses.map((item) => (
            <li key={item.id} className="inline-flex items-center gap-1 rounded-full bg-sun-100 py-1 pr-1 pl-3 text-sm font-semibold text-sun-700">
              {item.name}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => toggleHomeroom(item.id, false)}
                  disabled={pending}
                  className="inline-flex size-6 items-center justify-center rounded-full hover:bg-sun-200"
                  aria-label={t("homeroomRemove", { className: item.name })}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-4">
            <label htmlFor="homeroom" className="text-sm font-medium text-ink">
              {t("homeroomAdd")}
            </label>
            <NativeSelect
              id="homeroom"
              className="mt-2"
              value=""
              onChange={(event) => event.target.value && toggleHomeroom(event.target.value, true)}
              disabled={pending}
            >
              <option value="">{t("chooseClass")}</option>
              {options
                .filter((option) => option.homeroomStaffId !== staffId)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.homeroomStaffId ? t("homeroomReplace", { className: option.name }) : option.name}
                  </option>
                ))}
            </NativeSelect>
          </div>
        )}
      </section>
    </div>
  );
}
