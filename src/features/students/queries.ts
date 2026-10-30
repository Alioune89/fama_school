import "server-only";
import { sanitizeSearch } from "@/lib/search";
import type { ExistingStudent } from "./import-parser";
import { createClient } from "@/lib/supabase/server";

export type StudentListFilters = { q?: string; classId?: string | null };

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

async function currentYear(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id, label")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  return data;
}

/** Classes de l'année en cours (formulaire d'inscription, filtre, contrôle de l'import), avec leur effectif. */
export async function listClassOptions(schoolId: string) {
  const year = await currentYear(schoolId);
  if (!year) return { yearLabel: null, classes: [] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, capacity, level:levels(position), enrollments!enrollments_class_id_school_id_fkey(count)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", year.id)
    .eq("enrollments.status", "active");
  if (error) throw error;

  const classes = (data ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      capacity: c.capacity,
      position: c.level?.position ?? 0,
      count: c.enrollments[0]?.count ?? 0,
    }))
    .sort((a, b) => a.position - b.position || byName(a.name, b.name))
    .map(({ id, name, capacity, count }) => ({ id, name, capacity, count }));

  return { yearLabel: year.label, classes };
}

export type ClassOption = Awaited<ReturnType<typeof listClassOptions>>["classes"][number];

/** Tous les élèves de l'école (nom, naissance, classe de l'année), pour repérer les doublons à l'import. */
export async function listExistingStudents(schoolId: string): Promise<ExistingStudent[]> {
  const year = await currentYear(schoolId);
  const supabase = await createClient();
  const result: ExistingStudent[] = [];
  // L'API renvoie 1 000 lignes au plus par requête : lecture par pages.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("students")
      .select(
        "first_name, last_name, birth_date, enrollments(status, academic_year_id, class:classes!enrollments_class_id_school_id_fkey(name))",
      )
      .eq("school_id", schoolId)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    for (const student of data) {
      const current = student.enrollments.find((e) => e.status === "active" && e.academic_year_id === year?.id);
      result.push({
        firstName: student.first_name,
        lastName: student.last_name,
        birthDate: student.birth_date,
        className: current?.class?.name ?? null,
      });
    }
    if (data.length < 1000) return result;
  }
}

/** Élèves inscrits pour l'année en cours, avec leur classe et leur parent principal. */
export async function listStudents(schoolId: string, filters: StudentListFilters = {}) {
  const year = await currentYear(schoolId);
  if (!year) return { hasYear: false, students: [] };

  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select(
      "id, matricule, first_name, last_name, sex, birth_date, status, enrollments!inner(class_id, academic_year_id, status, class:classes!enrollments_class_id_school_id_fkey(name)), student_guardians(is_primary, guardian:guardians(full_name, phone))",
    )
    .eq("school_id", schoolId)
    .eq("enrollments.academic_year_id", year.id)
    .order("last_name")
    .order("first_name")
    .limit(1000);

  if (filters.classId) query = query.eq("enrollments.class_id", filters.classId);

  // Chaque mot doit figurer dans le prénom, le nom ou le matricule (« Awa Diop » comme « Diop Awa »).
  const q = sanitizeSearch(filters.q);
  for (const word of q?.split(" ") ?? []) {
    query = query.or(`first_name.ilike.%${word}%,last_name.ilike.%${word}%,matricule.ilike.%${word}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const students = (data ?? []).map((student) => {
    const enrollment = student.enrollments[0];
    const primary = student.student_guardians.find((link) => link.is_primary) ?? student.student_guardians[0];
    return {
      id: student.id,
      matricule: student.matricule,
      firstName: student.first_name,
      lastName: student.last_name,
      fullName: `${student.first_name} ${student.last_name}`,
      sex: student.sex,
      birthDate: student.birth_date,
      status: student.status,
      className: enrollment?.class?.name ?? null,
      enrollmentStatus: enrollment?.status ?? null,
      guardianName: primary?.guardian?.full_name ?? null,
      guardianPhone: primary?.guardian?.phone ?? null,
    };
  });

  return { hasYear: true, students };
}

/** Fiche d'un élève : identité, parcours (inscriptions) et parents. */
export async function getStudent(schoolId: string, studentId: string) {
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select(
      "id, matricule, first_name, last_name, sex, birth_date, birth_place, nationality, address, medical_notes, photo_path, status, created_at, student_documents(id, kind, file_name, file_path, mime_type, size_bytes, created_at), enrollments(id, status, enrolled_on, left_on, class:classes!enrollments_class_id_school_id_fkey(id, name, year:academic_years(label, is_current))), student_guardians(relationship, is_primary, guardian:guardians(id, full_name, phone, email, profession, user_id))",
    )
    .eq("school_id", schoolId)
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return null;

  const enrollments = student.enrollments
    .map((e) => ({
      id: e.id,
      status: e.status,
      enrolledOn: e.enrolled_on,
      leftOn: e.left_on,
      className: e.class?.name ?? "",
      classId: e.class?.id ?? null,
      yearLabel: e.class?.year?.label ?? "",
      isCurrent: e.class?.year?.is_current ?? false,
    }))
    .sort((a, b) => b.yearLabel.localeCompare(a.yearLabel));

  const guardians = student.student_guardians
    .filter((link) => link.guardian)
    .map((link) => ({ ...link.guardian!, relationship: link.relationship, isPrimary: link.is_primary }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || byName(a.full_name, b.full_name));

  // Liens signés (1 h) : le stockage des documents est privé.
  const storage = supabase.storage.from("student-documents");
  const [photo, documents] = await Promise.all([
    student.photo_path ? storage.createSignedUrl(student.photo_path, 3600) : Promise.resolve(null),
    Promise.all(
      [...student.student_documents]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(async (doc) => {
          const { data } = await storage.createSignedUrl(doc.file_path, 3600, { download: doc.file_name });
          return {
            id: doc.id,
            kind: doc.kind,
            fileName: doc.file_name,
            mimeType: doc.mime_type,
            sizeBytes: doc.size_bytes,
            createdAt: doc.created_at,
            url: data?.signedUrl ?? null,
          };
        }),
    ),
  ]);

  return {
    student,
    photoUrl: photo?.data?.signedUrl ?? null,
    documents,
    current: enrollments.find((e) => e.isCurrent) ?? null,
    enrollments,
    guardians,
  };
}

export type StudentDetail = NonNullable<Awaited<ReturnType<typeof getStudent>>>;
