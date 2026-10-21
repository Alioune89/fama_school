"use client";

import { useUrlParams } from "@/components/data/use-url-params";
import { NativeSelect } from "@/components/ui/native-select";

/** Choix de la classe de la grille (paramètre « classe » de l'adresse). */
export function ClassPicker({
  label,
  value,
  classes,
}: {
  label: string;
  value: string;
  classes: { id: string; name: string }[];
}) {
  const setParams = useUrlParams();
  return (
    <label className="block w-full sm:w-auto">
      <span className="sr-only">{label}</span>
      <NativeSelect
        value={value}
        onChange={(event) => setParams({ classe: event.target.value })}
        className="sm:min-w-44 [&_select]:rounded-full [&_select]:shadow-card"
      >
        {classes.map((klass) => (
          <option key={klass.id} value={klass.id}>
            {klass.name}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
