import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ConsentGate } from "@/features/consents/components/consent-gate";

export default function ParentLayout({ children }: LayoutProps<"/[locale]/parent">) {
  return (
    <AppShell space="parent">
      <Suspense>
        <ConsentGate />
      </Suspense>
      {children}
    </AppShell>
  );
}
