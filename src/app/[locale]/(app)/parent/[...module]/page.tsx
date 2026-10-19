import { plannedModuleParams, SpaceModulePage } from "@/components/layout/space-module-page";

export function generateStaticParams() {
  return plannedModuleParams("parent");
}

export default async function ParentModulePage({ params }: PageProps<"/[locale]/parent/[...module]">) {
  const { module } = await params;
  return <SpaceModulePage space="parent" module={module} />;
}
