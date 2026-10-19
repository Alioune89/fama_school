import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl bg-white px-6 py-12 text-center shadow-card ring-1 ring-line/70",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-azure-50 text-azure-700">
        <Icon className="size-7" aria-hidden strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {body && <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
