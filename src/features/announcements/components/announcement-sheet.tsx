"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { publishAnnouncement } from "../actions";
import type { AnnouncementAudience } from "../queries";

const AUDIENCES: AnnouncementAudience[] = ["parents", "classes", "overdue", "staff"];

/** Nouvelle annonce : titre, texte, destinataires (tous les parents, des classes, les familles en retard, le personnel). */
export function AnnouncementSheet({ classes }: { classes: { id: string; name: string }[] }) {
  const t = useTranslations("announcements");
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<AnnouncementAudience>("parents");
  const [classIds, setClassIds] = useState<Set<string>>(new Set());
  const form = useActionForm(publishAnnouncement, {
    onSuccess: ({ recipients }) => {
      toast.success(t("published", { count: recipients }));
      setOpen(false);
      setClassIds(new Set());
    },
  });

  function toggleClass(id: string, checked: boolean) {
    const next = new Set(classIds);
    if (checked) next.add(id);
    else next.delete(id);
    setClassIds(next);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button>
            <Megaphone aria-hidden />
            {t("new")}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{t("new")}</SheetTitle>
          <SheetDescription>{t("newHint")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={submitForm((formData) =>
            form.run({
              title: String(formData.get("title") ?? ""),
              body: String(formData.get("body") ?? ""),
              audience,
              classIds: [...classIds],
            }),
          )}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("audience")}</legend>
            <div role="radiogroup" aria-label={t("audience")} className="grid gap-2">
              {AUDIENCES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={audience === value}
                  onClick={() => setAudience(value)}
                  className={cn(
                    "rounded-xl px-4 py-3 text-left ring-1",
                    audience === value ? "bg-azure-50 ring-2 ring-azure-500" : "bg-white ring-line hover:bg-muted/50",
                  )}
                >
                  <span className="block text-sm font-semibold text-ink">{t(`audiences.${value}`)}</span>
                  <span className="block text-xs text-muted-foreground">{t(`audienceHints.${value}`)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {audience === "classes" && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("classes")}</legend>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {classes.map((item) => (
                  <li key={item.id}>
                    <label className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-line hover:bg-muted/50">
                      <Checkbox
                        checked={classIds.has(item.id)}
                        onCheckedChange={(checked) => toggleClass(item.id, checked === true)}
                      />
                      {item.name}
                    </label>
                  </li>
                ))}
              </ul>
              <FieldError>{form.fieldError("classIds")}</FieldError>
            </fieldset>
          )}
          <Field data-invalid={form.hasError("title") || undefined}>
            <FieldLabel htmlFor="announcement-title">{t("titleLabel")}</FieldLabel>
            <Input
              id="announcement-title"
              name="title"
              maxLength={120}
              autoComplete="off"
              placeholder={t("titlePlaceholder")}
              aria-invalid={form.hasError("title") || undefined}
            />
            <FieldError>{form.fieldError("title")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("body") || undefined}>
            <FieldLabel htmlFor="announcement-body">{t("bodyLabel")}</FieldLabel>
            <Textarea
              id="announcement-body"
              name="body"
              rows={6}
              maxLength={4000}
              placeholder={t("bodyPlaceholder")}
              aria-invalid={form.hasError("body") || undefined}
            />
            <FieldError>{form.fieldError("body")}</FieldError>
          </Field>
          <FormAlert message={form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending}>
              {t("publish")}
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
