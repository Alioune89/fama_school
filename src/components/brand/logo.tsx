import { useId } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const gradientId = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6fc8f0" />
          <stop offset="1" stopColor="#1b8fc7" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <rect x="10" y="8" width="4.5" height="16" rx="2.25" fill="#fff" />
      <rect x="10" y="8" width="13" height="4.5" rx="2.25" fill="#fff" />
      <rect x="10" y="14.5" width="9" height="4" rx="2" fill="#fff" />
      <circle cx="24" cy="21.5" r="3" fill="#fae27c" />
    </svg>
  );
}

export function Logo({ className, name = "Fama School" }: { className?: string; name?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-heading text-lg font-bold tracking-tight text-ink">{name}</span>
    </span>
  );
}
