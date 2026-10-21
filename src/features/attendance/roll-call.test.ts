import { describe, expect, it } from "vitest";
import { countMarks, defaultSlot, nextStatus, resolveRollCall, type RosterStudent } from "./roll-call";

const roster: RosterStudent[] = [
  { id: "a", firstName: "Awa", lastName: "Fall" },
  { id: "b", firstName: "Modou", lastName: "Seck" },
];

describe("defaultSlot", () => {
  it("propose le matin avant 13 h et l'après-midi ensuite", () => {
    expect(defaultSlot(new Date("2026-10-21T07:45:00Z"))).toBe("morning");
    expect(defaultSlot(new Date("2026-10-21T12:59:00Z"))).toBe("morning");
    expect(defaultSlot(new Date("2026-10-21T13:00:00Z"))).toBe("afternoon");
  });
});

describe("nextStatus", () => {
  it("fait tourner présent, absent, en retard", () => {
    expect(nextStatus("present")).toBe("absent");
    expect(nextStatus("absent")).toBe("late");
    expect(nextStatus("late")).toBe("present");
  });
});

describe("resolveRollCall", () => {
  it("met tout le monde présent quand rien n'est enregistré", () => {
    expect(resolveRollCall(roster, null, null)).toEqual({ marks: { a: "present", b: "present" }, validatedAt: null });
  });

  it("reprend l'appel du serveur, élève nouveau compris", () => {
    const server = { takenAt: "2026-10-21T08:05:00Z", marks: { a: "absent" as const } };
    expect(resolveRollCall(roster, server, null)).toEqual({
      marks: { a: "absent", b: "present" },
      validatedAt: "2026-10-21T08:05:00Z",
    });
  });

  it("préfère la saisie du téléphone plus récente, même pas encore envoyée", () => {
    const server = { takenAt: "2026-10-21T08:05:00Z", marks: { a: "absent" as const } };
    const draft = { marks: { a: "late" as const }, validatedAt: null, updatedAt: "2026-10-21T08:20:00Z" };
    expect(resolveRollCall(roster, server, draft)).toEqual({ marks: { a: "late", b: "present" }, validatedAt: null });
  });

  it("ignore une saisie locale plus ancienne que l'appel du serveur (fait depuis un autre téléphone)", () => {
    const server = { takenAt: "2026-10-21T08:30:00Z", marks: { b: "absent" as const } };
    const draft = { marks: { a: "absent" as const }, validatedAt: "2026-10-21T08:05:00Z", updatedAt: "2026-10-21T08:05:00Z" };
    expect(resolveRollCall(roster, server, draft).marks).toEqual({ a: "present", b: "absent" });
  });
});

describe("countMarks", () => {
  it("compte présents, absents et retards", () => {
    expect(countMarks({ a: "present", b: "absent", c: "late", d: "present" })).toEqual({ present: 2, absent: 1, late: 1 });
  });
});
