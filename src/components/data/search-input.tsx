"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useUrlParams } from "./use-url-params";

/** Recherche reflétée dans l'URL (?q=…) : partageable, et le serveur filtre directement. */
export function SearchInput({ placeholder, label, param = "q" }: { placeholder: string; label: string; param?: string }) {
  const searchParams = useSearchParams();
  const setParams = useUrlParams();
  const [value, setValue] = useState(searchParams.get(param) ?? "");

  useEffect(() => {
    const current = searchParams.get(param) ?? "";
    if (value.trim() === current) return;
    const timer = window.setTimeout(() => setParams({ [param]: value.trim() || null }), 300);
    return () => window.clearTimeout(timer);
  }, [value, param, searchParams, setParams]);

  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-line bg-white pr-4 pl-11 text-sm text-ink shadow-card outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </label>
  );
}
