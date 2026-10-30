import { Suspense } from "react";
import { SectionGate, SectionGateFallback } from "@/components/layout/section-gate";

export default function Layout({ children }: LayoutProps<"/[locale]/direction/cahier-de-textes">) {
  return (
    <Suspense fallback={<SectionGateFallback />}>
      <SectionGate space="direction" href="/direction/cahier-de-textes">
        {children}
      </SectionGate>
    </Suspense>
  );
}
