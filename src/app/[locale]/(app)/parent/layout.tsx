import { AppShell } from "@/components/layout/app-shell";

export default function ParentLayout({ children }: LayoutProps<"/[locale]/parent">) {
  return <AppShell space="parent">{children}</AppShell>;
}
