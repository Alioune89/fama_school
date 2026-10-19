import { AppShell } from "@/components/layout/app-shell";

export default function ProfesseurLayout({ children }: LayoutProps<"/[locale]/professeur">) {
  return <AppShell space="professeur">{children}</AppShell>;
}
