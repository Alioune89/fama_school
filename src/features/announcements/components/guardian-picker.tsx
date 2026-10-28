"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type { GuardianOption } from "../queries";

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Choix des parents un par un : recherche (parent, enfant, téléphone), filtre par classe, cases à cocher,
 * tout sélectionner parmi les parents affichés. Un parent jamais connecté ne peut pas encore recevoir l'annonce.
 */
export function GuardianPicker({
  guardians,
  classes,
  selected,
  onChange,
}: {
  guardians: GuardianOption[];
  classes: { id: string; name: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const t = useTranslations("announcements.picker");
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");

  const visible = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return guardians.filter((guardian) => {
      if (classId && !guardian.children.some((child) => child.classId === classId)) return false;
      const haystack = normalize(
        [guardian.name, guardian.phone ?? "", ...guardian.children.map((child) => child.name)].join(" "),
      ).replace(/\s+/g, " ");
      return words.every((word) => haystack.includes(word) || haystack.replace(/\s/g, "").includes(word));
    });
  }, [guardians, query, classId]);
  const selectable = visible.filter((guardian) => guardian.hasAccount);
  const allVisibleSelected = selectable.length > 0 && selectable.every((guardian) => selected.has(guardian.id));

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(next);
  }

  function toggleVisible(checked: boolean) {
    const next = new Set(selected);
    for (const guardian of selectable) {
      if (checked) next.add(guardian.id);
      else next.delete(guardian.id);
    }
    onChange(next);
  }

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">{t("title")}</legend>
      <div className="grid gap-2">
        <label className="relative block">
          <span className="sr-only">{t("search")}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            autoComplete="off"
          />
        </label>
        <NativeSelect aria-label={t("classFilter")} value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">{t("allClasses")}</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 font-medium text-ink">
          <Checkbox
            checked={allVisibleSelected}
            disabled={selectable.length === 0}
            onCheckedChange={(checked) => toggleVisible(checked === true)}
          />
          {t("selectVisible", { count: selectable.length })}
        </label>
        <span className="font-semibold text-azure-700" role="status">
          {t("selected", { count: selected.size })}
        </span>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-lg px-3 py-6 text-center text-sm text-muted-foreground ring-1 ring-line">{t("none")}</p>
      ) : (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-lg ring-1 ring-line" aria-label={t("listLabel")}>
          {visible.map((guardian) => (
            <li key={guardian.id}>
              <label
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5",
                  guardian.hasAccount ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed opacity-70",
                )}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={selected.has(guardian.id)}
                  disabled={!guardian.hasAccount}
                  onCheckedChange={(checked) => toggle(guardian.id, checked === true)}
                />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-medium text-ink">{guardian.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {guardian.children
                      .map((child) => (child.className ? `${child.name} (${child.className})` : child.name))
                      .join(", ") || t("noChild")}
                  </span>
                  {!guardian.hasAccount && <span className="block text-xs font-medium text-sun-700">{t("noAccount")}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
