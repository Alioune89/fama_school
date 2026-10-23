import {
  acquisitionSummary,
  classStats,
  generalAverage,
  mention,
  ranks,
  round2,
  subjectAverage,
  type AcquisitionLevel,
  type ClassStats,
  type EvaluationKind,
  type EvaluationWeights,
  type Mention,
  type Rank,
} from "@/lib/domain/grading";
import type { MentionThresholds } from "@/lib/domain/school-settings";

/**
 * Contenu d'un bulletin, calculé une fois la période verrouillée puis figé en base (report_cards.data) :
 * le bulletin affiché, imprimé ou vérifié plus tard reste celui qui a été généré.
 * Sans dépendance au navigateur ni à la base (testé dans build.test.ts).
 */

export const REPORT_CARD_VERSION = 1;

export type GradingScale = "ten" | "twenty" | "appreciation";
export type Track = "french" | "arabic";

export type ReportCardSubject = {
  name: string;
  /** Intitulé en arabe (matières de la filière arabe). */
  nameAr: string | null;
  coefficient: number;
  /** Moyenne de l'élève au barème du cycle (null au préscolaire ou sans note qui compte). */
  average: number | null;
  /** Préscolaire : niveau d'acquisition le plus fréquent. */
  summary: AcquisitionLevel | null;
  rank: Rank | null;
  /** Moyenne de la classe dans la matière. */
  classAverage: number | null;
  appreciation: string;
};

export type ReportCardSection = {
  track: Track;
  subjects: ReportCardSubject[];
  /** Moyenne de la section (bulletin double franco-arabe), rang dans la classe sur cette moyenne. */
  average: number | null;
  rank: Rank | null;
};

export type ReportCardData = {
  version: typeof REPORT_CARD_VERSION;
  school: { name: string; city: string | null; address: string | null; phone: string | null; email: string | null };
  academicYear: string;
  periodLabel: string;
  className: string;
  levelLabel: string;
  classSize: number;
  scale: GradingScale;
  student: {
    firstName: string;
    lastName: string;
    matricule: string;
    sex: "F" | "M";
    birthDate: string | null;
    birthPlace: string | null;
  };
  /** Une section (programme français), ou deux pour une école franco-arabe dont la classe a des matières arabes. */
  sections: ReportCardSection[];
  /** Moyenne générale sur toutes les matières, pondérées par leur coefficient. */
  general: number | null;
  rank: Rank | null;
  classStats: ClassStats | null;
  mention: Mention | null;
  mentionWithheld: boolean;
  sanction: "warning" | "blame" | null;
  generalAppreciation: string;
  absences: { absent: number; late: number };
  homeroomTeacher: string | null;
};

export type BuildInput = {
  school: ReportCardData["school"];
  academicYear: string;
  periodLabel: string;
  className: string;
  levelLabel: string;
  scale: GradingScale;
  francoArabic: boolean;
  weights: EvaluationWeights;
  thresholds: { ten: MentionThresholds; twenty: MentionThresholds };
  homeroomTeacher: string | null;
  students: (ReportCardData["student"] & { id: string })[];
  subjects: { id: string; name: string; nameAr: string | null; track: Track; coefficient: number }[];
  evaluations: {
    subjectId: string;
    kind: EvaluationKind;
    maxScore: number | null;
    weight: number;
    grades: {
      studentId: string;
      status: "graded" | "absent" | "excused";
      score: number | null;
      acquisition: AcquisitionLevel | null;
    }[];
  }[];
  /** Appréciation par matière : clé `${subjectId}:${studentId}`. */
  appreciations: Map<string, string>;
  council: Map<string, { sanction: "warning" | "blame" | null; withholdMention: boolean; appreciation: string }>;
  absences: Map<string, { absent: number; late: number }>;
};

/** Résultat d'un élève dans une matière : moyenne au barème du cycle, ou niveau d'acquisition au préscolaire. */
function subjectResult(input: BuildInput, subjectId: string, studentId: string) {
  const grades = input.evaluations
    .filter((e) => e.subjectId === subjectId)
    .flatMap((evaluation) => {
      const grade = evaluation.grades.find((g) => g.studentId === studentId);
      return grade ? [{ evaluation, grade }] : [];
    });
  if (input.scale === "appreciation") {
    return {
      average: null,
      summary: acquisitionSummary(grades.flatMap(({ grade }) => (grade.acquisition ? [grade.acquisition] : []))),
    };
  }
  const average = subjectAverage(
    grades.flatMap(({ evaluation, grade }) =>
      evaluation.maxScore === null
        ? []
        : [
            {
              kind: evaluation.kind,
              score: grade.score,
              maxScore: evaluation.maxScore,
              status: grade.status,
              weight: evaluation.weight,
            },
          ],
    ),
    input.scale,
    input.weights,
  );
  return { average, summary: null };
}

/** Bulletins de toute une classe : rangs et moyennes de classe se calculent ensemble. */
export function buildClassReportCards(input: BuildInput): Map<string, ReportCardData> {
  const { scale } = input;
  const numeric = scale !== "appreciation";

  // Résultat de chaque élève dans chaque matière, puis rangs et moyennes de classe par matière.
  const results = new Map(
    input.students.map((student) => [
      student.id,
      new Map(input.subjects.map((subject) => [subject.id, subjectResult(input, subject.id, student.id)])),
    ]),
  );
  const subjectRanks = new Map(
    input.subjects.map((subject) => [
      subject.id,
      ranks(input.students.map((s) => ({ id: s.id, average: results.get(s.id)!.get(subject.id)!.average }))),
    ]),
  );
  const subjectClassAverages = new Map(
    input.subjects.map((subject) => [
      subject.id,
      classStats(input.students.map((s) => results.get(s.id)!.get(subject.id)!.average))?.average ?? null,
    ]),
  );

  const averageOf = (studentId: string, subjects: BuildInput["subjects"]) =>
    numeric
      ? generalAverage(
          subjects.map((subject) => ({
            average: results.get(studentId)!.get(subject.id)!.average,
            coefficient: subject.coefficient,
          })),
        )
      : null;

  // Bulletin double : programme français puis programme arabe, chacun avec sa moyenne et son rang.
  const tracks: Track[] =
    input.francoArabic && input.subjects.some((s) => s.track === "arabic") ? ["french", "arabic"] : ["french"];
  const sectionSubjects = (track: Track) =>
    tracks.length === 1 ? input.subjects : input.subjects.filter((s) => s.track === track);
  const sectionRanks = new Map(
    tracks.map((track) => [
      track,
      ranks(input.students.map((s) => ({ id: s.id, average: averageOf(s.id, sectionSubjects(track)) }))),
    ]),
  );

  const generals = new Map(input.students.map((s) => [s.id, averageOf(s.id, input.subjects)]));
  const generalRanks = ranks(input.students.map((s) => ({ id: s.id, average: generals.get(s.id)! })));
  const stats = classStats([...generals.values()]);

  const cards = new Map<string, ReportCardData>();
  for (const { id, ...student } of input.students) {
    const general = generals.get(id)!;
    const council = input.council.get(id);
    cards.set(id, {
      version: REPORT_CARD_VERSION,
      school: input.school,
      academicYear: input.academicYear,
      periodLabel: input.periodLabel,
      className: input.className,
      levelLabel: input.levelLabel,
      classSize: input.students.length,
      scale,
      student,
      sections: tracks.map((track) => {
        const average = averageOf(id, sectionSubjects(track));
        return {
          track,
          subjects: sectionSubjects(track).map((subject) => {
            const result = results.get(id)!.get(subject.id)!;
            return {
              name: subject.name,
              nameAr: subject.nameAr,
              coefficient: subject.coefficient,
              average: result.average === null ? null : round2(result.average),
              summary: result.summary,
              rank: subjectRanks.get(subject.id)!.get(id) ?? null,
              classAverage: subjectClassAverages.get(subject.id)!,
              appreciation: input.appreciations.get(`${subject.id}:${id}`) ?? "",
            };
          }),
          average: average === null ? null : round2(average),
          rank: sectionRanks.get(track)!.get(id) ?? null,
        };
      }),
      general: general === null ? null : round2(general),
      rank: generalRanks.get(id) ?? null,
      classStats: stats,
      mention: numeric ? mention(general, input.thresholds[scale]) : null,
      mentionWithheld: council?.withholdMention ?? false,
      sanction: council?.sanction ?? null,
      generalAppreciation: council?.appreciation ?? "",
      absences: input.absences.get(id) ?? { absent: 0, late: 0 },
      homeroomTeacher: input.homeroomTeacher,
    });
  }
  return cards;
}
