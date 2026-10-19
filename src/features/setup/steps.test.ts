import { describe, expect, it } from "vitest";
import { computeSetupStatus, type SetupFacts } from "./steps";

const empty: SetupFacts = {
  school: { city: null, phone: null },
  hasCurrentYear: false,
  levelsCount: 0,
  levelSubjectsCount: 0,
  classesCount: 0,
  evaluationSaved: false,
};

describe("computeSetupStatus", () => {
  it("une école neuve commence par son identité", () => {
    const status = computeSetupStatus(empty);
    expect(status.completed).toBe(0);
    expect(status.total).toBe(6);
    expect(status.nextStep).toBe("school");
  });

  it("propose la première étape non faite, même si une suivante est faite", () => {
    const status = computeSetupStatus({ ...empty, school: { city: "Dakar", phone: "+221338000001" }, levelsCount: 10 });
    expect(status.school).toBe(true);
    expect(status.levels).toBe(true);
    expect(status.nextStep).toBe("year");
    expect(status.completed).toBe(2);
  });

  it("n'a plus d'étape suivante quand tout est fait", () => {
    const status = computeSetupStatus({
      school: { city: "Pikine", phone: "+221338000002" },
      hasCurrentYear: true,
      levelsCount: 4,
      levelSubjectsCount: 30,
      classesCount: 8,
      evaluationSaved: true,
    });
    expect(status.completed).toBe(6);
    expect(status.nextStep).toBeNull();
  });
});
