import { plannedModuleParams, SpaceModulePage } from "@/components/layout/space-module-page";

export function generateStaticParams() {
  return plannedModuleParams("professeur");
}

export default async function ProfesseurModulePage({ params }: PageProps<"/[locale]/professeur/[...module]">) {
  const { module } = await params;
  return <SpaceModulePage space="professeur" module={module} />;
}
