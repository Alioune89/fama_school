import { describe, expect, it } from "vitest";
import { summarizeProgress, type ChapterStatus } from "./programme";

const chapters = [
  { id: "a", targetMonth: "2026-10-01" },
  { id: "b", targetMonth: "2026-11-01" },
  { id: "c", targetMonth: "2026-12-01" },
  { id: "d", targetMonth: null },
];

describe("summarizeProgress", () => {
  it("en décembre, octobre et novembre sont attendus : un seul fait, un chapitre de retard", () => {
    const statuses = new Map<string, ChapterStatus>([
      ["a", "validated"],
      ["b", "in_progress"],
    ]);
    expect(summarizeProgress(chapters, statuses, "2026-12-10")).toEqual({
      total: 4,
      validated: 1,
      done: 0,
      inProgress: 1,
      expected: 2,
      delay: 1,
      state: "behind",
    });
  });

  it("un chapitre terminé, même pas encore validé, compte comme fait ; fait avant son mois : en avance", () => {
    const statuses = new Map<string, ChapterStatus>([
      ["a", "validated"],
      ["b", "done"],
      ["c", "done"],
    ]);
    // En novembre : octobre fait (à l'heure), novembre fait (dans son mois), décembre déjà fait (en avance).
    const summary = summarizeProgress(chapters, statuses, "2026-11-10");
    expect(summary.delay).toBe(-1);
    expect(summary.state).toBe("ahead");
  });

  it("des chapitres faits dans leur mois sont dans les temps, pas en avance", () => {
    const statuses = new Map<string, ChapterStatus>([["a", "done"]]);
    expect(summarizeProgress(chapters, statuses, "2026-10-29").state).toBe("onTrack");
  });

  it("sans chapitre attendu ni fait : dans les temps", () => {
    expect(summarizeProgress(chapters, new Map(), "2026-10-15").state).toBe("onTrack");
  });
});
