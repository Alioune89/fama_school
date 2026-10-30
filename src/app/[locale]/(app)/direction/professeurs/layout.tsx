import { Suspense } from "react";
import { SectionGate, SectionGateFallback } from "@/components/layout/section-gate";

export default function Layout({ children }: LayoutProps<"/[locale]/direction/professeurs">) {
  return (
    <Suspense fallback={<SectionGateFallback />}>
      <SectionGate space="direction" href="/direction/professeurs">
        {children}
      </SectionGate>
    </Suspense>
  );
}
