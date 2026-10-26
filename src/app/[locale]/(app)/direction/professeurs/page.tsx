import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronRight, GraduationCap, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { SearchInput } from "@/components/data/search-input";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import { AccountPill, ContractPill } from "@/features/staff/components/staff-pills";
import { StaffFormSheet } from "@/features/staff/components/staff-form-sheet";
import { listSchoolCycles, listTeachers } from "@/features/staff/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatPhone } from "@/lib/phone";
import { Constants } from "@/lib/supabase/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("teachers") };
}

async function AddTeacherButton() {
  const { entry } = await requireSpace("direction");
  if (!permissions.inviteRole(entry.roles, "teacher")) return null;
  const [t, cycles] = await Promise.all([getTranslations("staff"), listSchoolCycles(entry.schoolId!)]);
  return (
    <StaffFormSheet
      kind="teacher"
      cycles={cycles}
      trigger={
        <Button variant="sun">
          <Plus aria-hidden />
          {t("form.addTeacher")}
        </Button>
      }
    />
  );
}

const CYCLE_CODES = Constants.public.Enums.cycle_code;

/** Filtre par cycle, limité aux cycles ouverts par l'école. */
async function CycleFilter() {
  const { entry } = await requireSpace("direction");
  const [cycles, t] = await Promise.all([listSchoolCycles(entry.schoolId!), getTranslations("staff")]);
  if (cycles.length < 2) return null;
  return (
    <FilterSelect
      param="cycle"
      label={t("list.cycle")}
      allLabel={t("list.allCycles")}
      options={cycles.map((cycle) => ({ value: cycle.code, label: cycle.label }))}
    />
  );
}

async function TeachersList({ searchParams }: { searchParams: PageProps<"/[locale]/direction/professeurs">["searchParams"] }) {
  const { entry } = await requireSpace("direction");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const contract = params.contrat === "permanent" || params.contrat === "vacataire" ? params.contrat : null;
  const cycle = CYCLE_CODES.find((code) => code === params.cycle) ?? null;
  const [teachers, cycles, t] = await Promise.all([
    listTeachers(entry.schoolId!, { q, contract, cycle }),
    listSchoolCycles(entry.schoolId!),
    getTranslations("staff"),
  ]);
  const filtered = Boolean(q || contract || cycle);
  const cycleLabel = (code: string | null) => cycles.find((c) => c.code === code)?.label ?? "—";
  const subjectsOf = (teacher: (typeof teachers)[number]) =>
    [
      ...teacher.titularOf.map((className) => t("list.allSubjects", { className })),
      ...(teacher.subjects.length > 0 ? [teacher.subjects.join(", ")] : []),
    ].join(" · ");

  if (teachers.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={filtered ? t("list.noResults") : t("list.emptyTeachers")}
        body={filtered ? undefined : t("list.emptyTeachersHint")}
      />
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">{t("list.count", { count: teachers.length })}</p>

      {/* Colonnes secondaires (classes, puis cycle et téléphone) seulement sur grand écran ; défilement si le tableau déborde. */}
      <div className="hidden overflow-x-auto rounded-xl bg-white shadow-card ring-1 ring-line/70 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-azure-50 text-xs font-semibold text-ink-soft">
            <tr>
              <th scope="col" className="px-4 py-4">
                {t("list.teacher")}
              </th>
              <th scope="col" className="hidden px-4 py-4 2xl:table-cell">
                {t("list.cycle")}
              </th>
              <th scope="col" className="px-4 py-4">
                {t("list.subjects")}
              </th>
              <th scope="col" className="hidden px-4 py-4 xl:table-cell">
                {t("list.classes")}
              </th>
              <th scope="col" className="hidden px-4 py-4 2xl:table-cell">
                {t("list.phone")}
              </th>
              <th scope="col" className="px-4 py-4">
                {t("list.contract")}
              </th>
              <th scope="col" className="px-4 py-4">
                {t("list.account")}
              </th>
              <th scope="col" className="hidden w-10 px-3 py-4 xl:table-cell">
                <span className="sr-only">{t("list.open")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {teachers.map((teacher) => (
              <tr key={teacher.id} className="group relative transition-colors hover:bg-azure-50/60">
                <td className="px-4 py-3.5">
                  <Link
                    href={`/direction/professeurs/${teacher.id}`}
                    className="flex max-w-60 items-center gap-3 after:absolute after:inset-0"
                  >
                    <PersonAvatar name={teacher.full_name} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{teacher.full_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{teacher.title ?? teacher.email ?? ""}</span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-4 py-3.5 whitespace-nowrap text-ink-soft 2xl:table-cell">{cycleLabel(teacher.cycle)}</td>
                <td className="max-w-56 px-4 py-3.5 text-ink-soft">{subjectsOf(teacher) || "—"}</td>
                <td className="hidden max-w-48 min-w-28 px-4 py-3.5 text-ink-soft xl:table-cell">
                  {teacher.classes.join(", ") || "—"}
                </td>
                <td className="tabular hidden px-4 py-3.5 whitespace-nowrap text-ink-soft 2xl:table-cell">
                  {formatPhone(teacher.phone) || "—"}
                </td>
                <td className="px-4 py-3.5">
                  <ContractPill contract={teacher.contract} />
                </td>
                <td className="px-4 py-3.5">
                  <AccountPill linked={Boolean(teacher.user_id)} status={teacher.status} />
                </td>
                <td className="hidden px-3 py-3.5 text-muted-foreground xl:table-cell">
                  <ChevronRight className="size-4" aria-hidden />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {teachers.map((teacher) => (
          <li key={teacher.id}>
            <Link
              href={`/direction/professeurs/${teacher.id}`}
              className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70"
            >
              <PersonAvatar name={teacher.full_name} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{teacher.full_name}</span>
                <span className="block text-sm text-muted-foreground">
                  {[teacher.cycle ? cycleLabel(teacher.cycle) : null, subjectsOf(teacher) || teacher.title]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <ContractPill contract={teacher.contract} />
                  <AccountPill linked={Boolean(teacher.user_id)} status={teacher.status} />
                </span>
              </span>
              <ChevronRight className="mt-1 size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function TeachersPage({ searchParams }: PageProps<"/[locale]/direction/professeurs">) {
  const t = await getTranslations("staff");
  const tNav = await getTranslations("nav");

  return (
    <>
      <PageHeader
        title={tNav("teachers")}
        description={t("list.teachersHint")}
        actions={
          <Suspense fallback={null}>
            <AddTeacherButton />
          </Suspense>
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Suspense fallback={<div className="h-11 w-72 rounded-full bg-white shadow-card" aria-hidden />}>
          <SearchInput placeholder={t("list.searchTeachers")} label={t("list.search")} />
          <CycleFilter />
          <FilterSelect
            param="contrat"
            label={t("list.contract")}
            allLabel={t("list.allContracts")}
            options={[
              { value: "permanent", label: t("contracts.permanent") },
              { value: "vacataire", label: t("contracts.vacataire") },
            ]}
          />
        </Suspense>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <TeachersList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
