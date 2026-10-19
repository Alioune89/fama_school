import { AppShell } from "@/components/layout/app-shell";

export default function DirectionLayout({ children }: LayoutProps<"/[locale]/direction">) {
  return <AppShell space="direction">{children}</AppShell>;
}
