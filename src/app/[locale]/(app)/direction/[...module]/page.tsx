import { plannedModuleParams, SpaceModulePage } from "@/components/layout/space-module-page";

export function generateStaticParams() {
  return plannedModuleParams("direction");
}

export default async function DirectionModulePage({ params }: PageProps<"/[locale]/direction/[...module]">) {
  const { module } = await params;
  return <SpaceModulePage space="direction" module={module} />;
}
