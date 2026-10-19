import { AppShell } from "@/components/layout/app-shell";

export default function PlateformeLayout({ children }: LayoutProps<"/[locale]/plateforme">) {
  return <AppShell space="plateforme">{children}</AppShell>;
}
