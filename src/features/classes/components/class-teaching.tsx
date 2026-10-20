"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { StatusPill } from "@/components/dashboard/status-pill";
import { useMessage } from "@/components/forms/use-action-form";
import { NativeSelect } from "@/components/ui/native-select";
import type { ClassDetail } from "@/features/classes/queries";
import { assignTeaching, removeTeaching } from "@/features/staff/actions";

type Props = {
  classId: string;
  subjects: ClassDetail["subjects"];
  teachers: ClassDetail["teachers"];
  canEdit: boolean;
};

/** Matières du niveau et professeur de chacune dans la classe (affectation directe depuis la liste). */
export function ClassTeaching({ classId, subjects, teachers, canEdit }: Props) {
  const t = useTranslations("classes.teaching");
  const message = useMessage();
  const [pending, startTransition] = useTransition();

  const change = (subject: ClassDetail["subjects"][number], staffId: string) =>
    startTransition(async () => {
      const result = staffId
        ? await assignTeaching({ staffId, classId, subjectId: subject.id })
        : subject.assignmentId
          ? await removeTeaching({ assignmentId: subject.assignmentId })
          : null;
      if (!result) return;
      if (result.ok) toast.success(staffId ? t("assigned") : t("unassigned"));
      else toast.error(message(result.error));
    });

  if (subjects.length === 0) return <p className="mt-3 text-sm text-muted-foreground">{t("noSubjects")}</p>;

  return (
    <ul className="mt-4 divide-y divide-line">
      {subjects.map((subject) => (
        <li key={subject.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{subject.name}</p>
            <p className="text-xs text-muted-foreground">
              {t("coefficient", { value: subject.coefficient })}
              {subject.weeklyHours !== null && ` · ${t("hours", { value: subject.weeklyHours })}`}
            </p>
          </div>
          {canEdit ? (
            <NativeSelect
              aria-label={t("teacherFor", { subject: subject.name })}
              value={subject.teacherId ?? ""}
              disabled={pending}
              onChange={(event) => change(subject, event.target.value)}
              className="sm:w-60"
            >
              <option value="">{t("unassignedOption")}</option>
              {subject.teacherId && !teachers.some((teacher) => teacher.id === subject.teacherId) && (
                <option value={subject.teacherId}>{subject.teacherName}</option>
              )}
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </NativeSelect>
          ) : subject.teacherName ? (
            <span className="text-sm text-ink-soft">{subject.teacherName}</span>
          ) : (
            <StatusPill tone="warning">{t("unassignedOption")}</StatusPill>
          )}
        </li>
      ))}
    </ul>
  );
}
