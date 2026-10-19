import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "cn"

/** Liste déroulante native : sélecteur du système sur téléphone, fonctionne sans JavaScript. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        data-slot="native-select"
        className="h-11 w-full min-w-0 appearance-none rounded-xl border border-input bg-white py-2 pr-10 pl-3.5 text-base text-ink transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  )
}

export { NativeSelect }
