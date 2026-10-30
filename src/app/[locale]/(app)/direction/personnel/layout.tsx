import { Suspense } from "react";
import { SectionGate, SectionGateFallback } from "@/components/layout/section-gate";

export default function Layout({ children }: LayoutProps<"/[locale]/direction/personnel">) {
  return (
    <Suspense fallback={<SectionGateFallback />}>
      <SectionGate space="direction" href="/direction/personnel">
        {children}
      </SectionGate>
    </Suspense>
  );
}
