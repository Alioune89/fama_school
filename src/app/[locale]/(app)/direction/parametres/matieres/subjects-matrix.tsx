"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { saveSubjects } from "@/features/setup/actions";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ARABIC_SUBJECT_PRESETS,
  SUBJECT_PRESETS,
  appliesToLevel,
  coefficientFor,
  type CycleCode,
  type GradingScale,
  type SubjectTrack,
} from "@/lib/domain/senegal-presets";
import { cn } from "@/lib/utils";

export type MatrixLevel = { id: string; code: string; series: string | null; label: string };
export type MatrixCycle = { code: CycleCode; label: string; gradingScale: GradingScale; levels: MatrixLevel[] };
export type MatrixSubject = {
  id: string | null;
  name: string;
  nameAr: string;
  shortName: string;
  group: string;
  track: SubjectTrack;
  coefficients: Record<string, number | null>;
};

type Row = MatrixSubject & { key: string; cycles: CycleCode[] };

let localKey = 0;
const newKey = () => `nouvelle-${++localKey}`;
const normalize = (name: string) => name.trim().toLocaleLowerCase("fr");

export function SubjectsMatrix({
  cycles,
  subjects,
  francoArabic,
  canEdit,
  nextHref,
}: {
  cycles: MatrixCycle[];
  subjects: MatrixSubject[];
  francoArabic: boolean;
  canEdit: boolean;
  nextHref: string;
}) {
  const t = useTranslations("setup");
  const router = useRouter();
  const levelCycle = useMemo(
    () => new Map(cycles.flatMap((cycle) => cycle.levels.map((level) => [level.id, cycle.code] as const))),
    [cycles],
  );

  const [rows, setRows] = useState<Row[]>(() =>
    subjects.map((subject) => ({
      ...subject,
      key: subject.id ?? newKey(),
      cycles: [
        ...new Set(
          Object.entries(subject.coefficients)
            .filter(([, value]) => value !== null)
            .map(([levelId]) => levelCycle.get(levelId))
            .filter((code): code is CycleCode => Boolean(code)),
        ),
      ],
    })),
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [activeCycle, setActiveCycle] = useState<CycleCode | undefined>(cycles[0]?.code);

  const form = useActionForm(saveSubjects, {
    onSuccess: () => {
      toast.success(t("saved"));
      router.push(nextHref);
    },
  });

  if (cycles.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <p className="text-sm text-muted-foreground">{t("subjects.noLevels")}</p>
        <Link href="/direction/parametres/niveaux" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">
          {t("steps.levels.title")}
        </Link>
      </div>
    );
  }

  const cycle = cycles.find((item) => item.code === activeCycle) ?? cycles[0]!;
  const visibleRows = rows.filter((row) => row.cycles.includes(cycle.code));

  const applyPresets = () => {
    setRows((current) => {
      // Copies : l'état précédent ne doit jamais être modifié en place.
      const next = current.map((row) => ({ ...row, coefficients: { ...row.coefficients }, cycles: [...row.cycles] }));
      for (const item of cycles) {
        const presets = [...SUBJECT_PRESETS[item.code], ...(francoArabic && item.code !== "prescolaire" ? ARABIC_SUBJECT_PRESETS : [])];
        for (const preset of presets) {
          let row = next.find((candidate) => normalize(candidate.name) === normalize(preset.name));
          if (!row) {
            row = {
              key: newKey(),
              id: null,
              name: preset.name,
              nameAr: preset.nameAr ?? "",
              shortName: preset.shortName,
              group: preset.group,
              track: preset.track,
              coefficients: {},
              cycles: [],
            };
            next.push(row);
          }
          if (!row.cycles.includes(item.code)) row.cycles = [...row.cycles, item.code];
          for (const level of item.levels) {
            if (row.coefficients[level.id] != null) continue;
            const applies = appliesToLevel(preset, { code: level.code, label: level.label, series: level.series ?? undefined });
            row.coefficients = {
              ...row.coefficients,
              [level.id]: applies && !preset.optional ? coefficientFor(preset.coefficient, level.series ?? undefined) : null,
            };
          }
        }
      }
      return [...next];
    });
    toast.info(t("subjects.presetsApplied"));
  };

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const setCoefficient = (row: Row, levelId: string, raw: string) => {
    const value = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    updateRow(row.key, { coefficients: { ...row.coefficients, [levelId]: Number.isFinite(value) ? value : null } });
  };

  const addRow = () =>
    setRows((current) => [
      ...current,
      {
        key: newKey(),
        id: null,
        name: "",
        nameAr: "",
        shortName: "",
        group: "",
        track: "french",
        coefficients: Object.fromEntries(cycle.levels.map((level) => [level.id, 1])),
        cycles: [cycle.code],
      },
    ]);

  const removeFromCycle = (row: Row) => {
    if (!window.confirm(t("subjects.removeConfirm", { name: row.name || t("subjects.newSubject") }))) return;
    const coefficients = { ...row.coefficients };
    for (const level of cycle.levels) coefficients[level.id] = null;
    const remaining = row.cycles.filter((code) => code !== cycle.code);
    if (remaining.length === 0) {
      setRows((current) => current.filter((item) => item.key !== row.key));
      if (row.id) setRemovedIds((current) => [...current, row.id!]);
    } else {
      updateRow(row.key, { coefficients, cycles: remaining });
    }
  };

  const submit = () => {
    const allLevels = cycles.flatMap((item) => item.levels);
    form.run({
      removedIds,
      rows: rows
        .filter((row) => row.id || Object.values(row.coefficients).some((value) => value !== null))
        .map((row) => ({
          id: row.id,
          name: row.name,
          nameAr: row.nameAr,
          shortName: row.shortName,
          group: row.group,
          track: row.track,
          coefficients: Object.fromEntries(allLevels.map((level) => [level.id, row.coefficients[level.id] ?? null])),
        })),
    });
  };

  const savedRows = rows.filter((row) => row.id || Object.values(row.coefficients).some((value) => value !== null));
  const cyclesWithErrors = new Set(
    savedRows.flatMap((row, index) => (form.hasErrorUnder(`rows.${index}`) ? row.cycles : [])),
  );

  const rowIndex = (key: string) => savedRows.findIndex((row) => row.key === key);

  return (
    <div className="grid gap-6">
      {!canEdit && <p className="rounded-xl bg-azure-50 px-4 py-3 text-sm text-azure-800">{t("readOnly")}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("steps.levels.title")} className="inline-flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-line/70">
          {cycles.map((item) => (
            <button
              key={item.code}
              type="button"
              role="tab"
              aria-selected={item.code === cycle.code}
              onClick={() => setActiveCycle(item.code)}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-semibold text-ink-soft transition-colors",
                item.code === cycle.code && "bg-azure-200 text-ink",
              )}
            >
              {item.label}
              {cyclesWithErrors.has(item.code) && (
                <span className="ml-2 inline-block size-2 rounded-full bg-destructive align-middle" aria-label={t("subjects.tabHasErrors")} />
              )}
            </button>
          ))}
        </div>
        {canEdit && (
          <Button type="button" variant="sun" onClick={applyPresets}>
            <Sparkles aria-hidden />
            {t("subjects.applyPresets")}
          </Button>
        )}
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-line/70">
        <p className="border-b border-line px-5 py-4 text-sm text-muted-foreground">
          {t("subjects.intro")} <span className="font-semibold text-azure-700">{t(`levels.gradingScale.${cycle.gradingScale}`)}</span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-azure-50 text-xs font-semibold text-ink-soft">
              <tr>
                <th scope="col" className="sticky left-0 z-10 min-w-56 bg-azure-50 px-4 py-3 text-left">
                  {t("subjects.subject")}
                </th>
                {cycle.levels.map((level) => (
                  <th key={level.id} scope="col" className="px-2 py-3 text-center whitespace-nowrap">
                    {level.series ? `${level.code} ${level.series}` : level.code}
                  </th>
                ))}
                {canEdit && <th scope="col" className="w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleRows.map((row) => {
                const index = rowIndex(row.key);
                const nameError = index >= 0 ? form.fieldError(`rows.${index}.name`) : undefined;
                return (
                  <tr key={row.key} className="group">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2 text-left font-normal group-hover:bg-canvas">
                      <input
                        value={row.name}
                        onChange={(event) => updateRow(row.key, { name: event.target.value })}
                        disabled={!canEdit}
                        placeholder={t("subjects.newSubject")}
                        aria-label={t("subjects.subject")}
                        aria-invalid={nameError ? true : undefined}
                        className="h-9 w-full min-w-48 rounded-lg border border-transparent bg-transparent px-2 font-semibold text-ink outline-none hover:border-line focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive"
                      />
                      <span className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                        {row.track === "arabic" && (
                          <span className="rounded-full bg-sun-100 px-2 py-0.5 font-semibold text-sun-700">
                            {t("subjects.track.arabic")}
                            {row.nameAr && <span dir="rtl" lang="ar" className="ml-1">{row.nameAr}</span>}
                          </span>
                        )}
                        {row.group && <span className="truncate">{row.group}</span>}
                      </span>
                      {nameError && <span role="alert" className="block px-2 text-xs text-destructive">{nameError}</span>}
                    </th>
                    {cycle.levels.map((level) => (
                      <td key={level.id} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0.5}
                          max={20}
                          step={0.5}
                          value={row.coefficients[level.id] ?? ""}
                          onChange={(event) => setCoefficient(row, level.id, event.target.value)}
                          disabled={!canEdit}
                          aria-label={`${row.name} — ${t("subjects.coefficientFor", { level: level.series ? `${level.code} ${level.series}` : level.code })}`}
                          aria-invalid={index >= 0 && form.hasError(`rows.${index}.coefficients.${level.id}`) ? true : undefined}
                          className={cn(
                            "tabular h-10 w-16 rounded-lg border border-line text-center font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
                            row.coefficients[level.id] != null ? "bg-lavender-50 text-ink" : "bg-white text-muted-foreground",
                          )}
                        />
                      </td>
                    ))}
                    {canEdit && (
                      <td className="px-2 text-center">
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFromCycle(row)} aria-label={t("subjects.remove")}>
                          <Trash2 aria-hidden />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="border-t border-line p-3">
            <Button type="button" variant="ghost" onClick={addRow}>
              <Plus aria-hidden />
              {t("subjects.addSubject")}
            </Button>
          </div>
        )}
      </section>

      <FormAlert message={form.formError} />
      {canEdit && (
        <div>
          <Button type="button" size="lg" disabled={form.pending} onClick={submit}>
            {t("saveAndContinue")}
          </Button>
        </div>
      )}
    </div>
  );
}
