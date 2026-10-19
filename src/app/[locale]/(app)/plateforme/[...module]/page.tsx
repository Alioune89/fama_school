import { plannedModuleParams, SpaceModulePage } from "@/components/layout/space-module-page";

export function generateStaticParams() {
  return plannedModuleParams("plateforme");
}

export default async function PlateformeModulePage({ params }: PageProps<"/[locale]/plateforme/[...module]">) {
  const { module } = await params;
  return <SpaceModulePage space="plateforme" module={module} />;
}
