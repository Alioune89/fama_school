"use client";

import { useTransition } from "react";
import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { PersonAvatar } from "@/components/people/person-avatar";
import { setStudentPhoto } from "@/features/students/document-actions";
import { uploadStudentFile } from "@/features/students/upload";

type Props = { schoolId: string; studentId: string; name: string; photoUrl: string | null; canEdit: boolean };

/** Photo d'identité : un toucher sur l'avatar ouvre l'appareil photo ou la galerie. */
export function StudentPhoto({ schoolId, studentId, name, photoUrl, canEdit }: Props) {
  const t = useTranslations("students.photo");
  const message = useMessage();
  const [pending, startTransition] = useTransition();

  if (!canEdit) return <PersonAvatar name={name} src={photoUrl} size="lg" className="size-20 text-2xl" />;

  const upload = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      const uploaded = await uploadStudentFile(file, { schoolId, studentId, maxImageSide: 600 });
      if ("error" in uploaded) {
        toast.error(t(`errors.${uploaded.error}`));
        return;
      }
      const result = await setStudentPhoto({ studentId, path: uploaded.path });
      if (result.ok) toast.success(t("updated"));
      else toast.error(message(result.error));
    });
  };

  const remove = () =>
    startTransition(async () => {
      const result = await setStudentPhoto({ studentId, path: null });
      if (result.ok) toast.success(t("removed"));
      else toast.error(message(result.error));
    });

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <label className="group relative cursor-pointer rounded-full focus-within:ring-3 focus-within:ring-ring/50">
        <span className="sr-only">{photoUrl ? t("change") : t("add")}</span>
        <PersonAvatar name={name} src={photoUrl} size="lg" className="size-20 text-2xl" />
        <span
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 grid size-7 place-items-center rounded-full bg-white text-ink shadow-card ring-1 ring-line group-hover:bg-azure-50"
        >
          <Camera className="size-3.5" />
        </span>
        {pending && <span aria-hidden className="absolute inset-0 animate-pulse rounded-full bg-white/60" />}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            upload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {photoUrl && (
        <button type="button" onClick={remove} disabled={pending} className="text-xs text-muted-foreground hover:text-ink">
          {t("remove")}
        </button>
      )}
    </div>
  );
}
