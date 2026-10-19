"use client";

import { useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { useUrlParams } from "./use-url-params";

/** Filtre en pilule (maquettes : « Toutes les classes ▾ ») synchronisé avec l'URL. */
export function FilterSelect({
  param,
  label,
  allLabel,
  options,
}: {
  param: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  const searchParams = useSearchParams();
  const setParams = useUrlParams();

  return (
    <label className="block w-full sm:w-auto">
      <span className="sr-only">{label}</span>
      <NativeSelect
        value={searchParams.get(param) ?? ""}
        onChange={(event) => setParams({ [param]: event.target.value || null })}
        className="sm:min-w-44 [&_select]:rounded-full [&_select]:shadow-card"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
