"use client";

import { useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { usePathname, useRouter } from "@/i18n/navigation";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="block w-full sm:w-auto">
      <span className="sr-only">{label}</span>
      <NativeSelect
        value={searchParams.get(param) ?? ""}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          if (event.target.value) params.set(param, event.target.value);
          else params.delete(param);
          params.delete("page");
          router.replace({ pathname, query: Object.fromEntries(params.entries()) }, { scroll: false });
        }}
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
