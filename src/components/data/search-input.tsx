"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

/** Recherche reflétée dans l'URL (?q=…) : partageable, et le serveur filtre directement. */
export function SearchInput({ placeholder, label, param = "q" }: { placeholder: string; label: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) ?? "");

  useEffect(() => {
    const current = searchParams.get(param) ?? "";
    if (value.trim() === current) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set(param, value.trim());
      else params.delete(param);
      params.delete("page");
      const query = Object.fromEntries(params.entries());
      router.replace({ pathname, query }, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [value, param, pathname, router, searchParams]);

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
