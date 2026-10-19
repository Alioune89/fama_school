"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { generateClasses } from "@/features/setup/actions";
import { Link, useRouter } from "@/i18n/navigation";
import { classNames } from "@/lib/domain/senegal-presets";

type Level = { id: string; code: string; label: string; series: string | null; cycleLabel: string; existing: string[] };

export function ClassesGenerator({
  levels,
  hasYear,
  yearLabel,
  canEdit,
  nextHref,
}: {
  levels: Level[];
  hasYear: boolean;
  yearLabel: string | null;
  canEdit: boolean;
  nextHref: string;
}) {
  const t = useTranslations("setup");
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(levels.map((level) => [level.id, Math.max(level.existing.length, 1)])),
  );
  const [capacity, setCapacity] = useState("45");

  const form = useActionForm(generateClasses, {
    onSuccess: ({ created }) => {
      toast.success(t("classes.created", { count: created }));
      router.push(nextHref);
    },
  });

  if (!hasYear || levels.length === 0) {
    const missing = !hasYear ? "year" : "levels";
    return (
      <div className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <p className="text-sm text-muted-foreground">{!hasYear ? t("classes.noYear") : t("classes.noLevels")}</p>
        <Link
          href={missing === "year" ? "/direction/parametres/annee" : "/direction/parametres/niveaux"}
          className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
        >
          {t(`steps.${missing}.title`)}
        </Link>
      </div>
    );
  }

  const setCount = (levelId: string, value: number) =>
    setCounts((current) => ({ ...current, [levelId]: Math.min(12, Math.max(0, value)) }));

  return (
    <form
      noValidate
      className="grid gap-6"
      action={() =>
        form.run({
          levels: levels.map((level) => ({ levelId: level.id, count: counts[level.id] ?? 0 })),
          capacity: capacity.trim() ? Number(capacity) : null,
        })
      }
    >
      {!canEdit && <p className="rounded-xl bg-azure-50 px-4 py-3 text-sm text-azure-800">{t("readOnly")}</p>}

      <section className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-line/70">
        <p className="border-b border-line px-5 py-4 text-sm text-muted-foreground">
          {yearLabel && <span className="font-semibold text-ink">{yearLabel} · </span>}
          {t("classes.intro")}
        </p>
        <ul className="divide-y divide-line">
          {levels.map((level) => {
            const count = counts[level.id] ?? 0;
            const names = classNames({ code: level.code, label: level.label, series: level.series ?? undefined }, count);
            const toCreate = names.filter((name) => !level.existing.includes(name));
            return (
              <li key={level.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {level.label} <span className="text-xs font-medium text-muted-foreground">· {level.cycleLabel}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {level.existing.map((name) => (
                      <span key={name} className="rounded-full bg-success-50 px-2 py-0.5 font-semibold text-success-700">
                        {name}
                      </span>
                    ))}
                    {toCreate.map((name) => (
                      <span key={name} className="rounded-full bg-azure-50 px-2 py-0.5 font-semibold text-azure-700">
                        + {name}
                      </span>
                    ))}
                  </p>
                </div>
                <div className="flex items-center gap-2" role="group" aria-label={`${t("classes.count")} — ${level.label}`}>
                  <Button type="button" variant="outline" size="icon" disabled={!canEdit || count <= 0} onClick={() => setCount(level.id, count - 1)} aria-label="−1">
                    <Minus aria-hidden />
                  </Button>
                  <span className="tabular w-8 text-center text-lg font-bold text-ink" aria-live="polite">
                    {count}
                  </span>
                  <Button type="button" variant="outline" size="icon" disabled={!canEdit || count >= 12} onClick={() => setCount(level.id, count + 1)} aria-label="+1">
                    <Plus aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="max-w-sm rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <Field>
          <FieldLabel htmlFor="capacity">{t("classes.capacity")}</FieldLabel>
          <Input id="capacity" type="number" inputMode="numeric" min={1} max={200} value={capacity} onChange={(event) => setCapacity(event.target.value)} disabled={!canEdit} />
        </Field>
      </section>

      <FormAlert message={form.formError} />
      {canEdit && (
        <div>
          <Button type="submit" size="lg" disabled={form.pending}>
            {t("classes.create")}
          </Button>
        </div>
      )}
    </form>
  );
}
