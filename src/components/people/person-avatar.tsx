import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONES = ["bg-lavender-200", "bg-azure-200", "bg-sun-200", "bg-lavender-100", "bg-azure-100", "bg-sun-100"] as const;

/** Couleur stable dérivée du nom : une même personne garde la même pastille partout. */
export function toneFor(name: string): (typeof TONES)[number] {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length]!;
}

export function PersonAvatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink",
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-16 text-xl",
        toneFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
