"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Clock, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type { GuardianOption } from "../queries";

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Enfants d'un parent en petites étiquettes : « Mariama · 6e A ». */
function ChildTags({ guardian, emptyLabel }: { guardian: GuardianOption; emptyLabel: string }) {
  if (guardian.children.length === 0) return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {guardian.children.map((child) => (
        <span key={child.name} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
          {child.className ? `${child.name.split(" ")[0]} · ${child.className}` : child.name}
        </span>
      ))}
    </span>
  );
}

/**
 * Choix des parents un par un : recherche (parent, enfant, téléphone), filtre par classe, cases à cocher.
 * Les parents connectés (qui recevront l'annonce) viennent d'abord ; ceux qui n'ont pas encore de compte sont
 * regroupés à part, sans case à cocher.
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
      );
      return words.every((word) => haystack.includes(word) || haystack.replace(/\s/g, "").includes(word));
    });
  }, [guardians, query, classId]);
  const reachable = visible.filter((guardian) => guardian.hasAccount);
  const unreachable = visible.filter((guardian) => !guardian.hasAccount);
  const allSelected = reachable.length > 0 && reachable.every((guardian) => selected.has(guardian.id));

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(next);
  }

  function toggleAll(checked: boolean) {
    const next = new Set(selected);
    for (const guardian of reachable) {
      if (checked) next.add(guardian.id);
      else next.delete(guardian.id);
    }
    onChange(next);
  }

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">{t("title")}</legend>
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

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <Checkbox
            checked={allSelected}
            disabled={reachable.length === 0}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
          {t("selectAll", { count: reachable.length })}
        </label>
        <span
          role="status"
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            selected.size > 0 ? "bg-azure-600 text-white" : "bg-white text-ink-soft ring-1 ring-line",
          )}
        >
          {t("selected", { count: selected.size })}
        </span>
      </div>

      {reachable.length === 0 ? (
        <p className="rounded-lg px-3 py-5 text-center text-sm text-muted-foreground ring-1 ring-line">
          {t(visible.length === 0 ? "none" : "noneReachable")}
        </p>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto p-0.5" aria-label={t("listLabel")}>
          {reachable.map((guardian) => {
            const checked = selected.has(guardian.id);
            return (
              <li key={guardian.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition-colors",
                    checked ? "bg-azure-50 ring-azure-500" : "bg-white ring-line hover:bg-muted/50",
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={(value) => toggle(guardian.id, value === true)} />
                  <PersonAvatar name={guardian.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{guardian.name}</span>
                    <ChildTags guardian={guardian} emptyLabel={t("noChild")} />
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {unreachable.length > 0 && (
        <details className="group rounded-xl ring-1 ring-line">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-ink-soft">
            <Clock className="size-4 shrink-0 text-sun-700" aria-hidden />
            <span className="flex-1">{t("notConnected", { count: unreachable.length })}</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="px-3 pb-2 text-xs text-muted-foreground">{t("notConnectedHint")}</p>
          <ul className="max-h-56 divide-y divide-line overflow-y-auto border-t border-line" aria-label={t("notConnectedLabel")}>
            {unreachable.map((guardian) => (
              <li key={guardian.id} className="flex items-center gap-3 px-3 py-2 opacity-75">
                <PersonAvatar name={guardian.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{guardian.name}</span>
                  <ChildTags guardian={guardian} emptyLabel={t("noChild")} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </fieldset>
  );
}
