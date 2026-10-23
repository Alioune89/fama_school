import { describe, expect, it } from "vitest";
import { cellsToMarks, formatScore, marksToCells, parseScore, resolveSheet, sheetStats, shortcut } from "./sheet";

describe("parseScore", () => {
  it("accepte la virgule et le point", () => {
    expect(parseScore("12,5", 20)).toBe(12.5);
    expect(parseScore(" 12.25 ", 20)).toBe(12.25);
    expect(parseScore("0", 10)).toBe(0);
  });

  it("une case vide n'est pas une note", () => {
    expect(parseScore("  ", 20)).toBeNull();
  });

  it("refuse les saisies invalides et les notes au-dessus du barème", () => {
    expect(parseScore("21", 20)).toBeUndefined();
    expect(parseScore("12,555", 20)).toBeUndefined();
    expect(parseScore("-2", 20)).toBeUndefined();
    expect(parseScore("douze", 20)).toBeUndefined();
  });
});

describe("shortcut", () => {
  it("« a » pour absent, « e » pour excusé", () => {
    expect(shortcut("A")).toBe("absent");
    expect(shortcut("e")).toBe("excused");
    expect(shortcut("ab")).toBeNull();
    expect(shortcut("12")).toBeNull();
  });
});

describe("cellsToMarks", () => {
  it("convertit la saisie et signale les notes invalides", () => {
    const { marks, invalid } = cellsToMarks(
      {
        s1: { kind: "score", text: "14,5" },
        s2: { kind: "absent" },
        s3: { kind: "score", text: "" },
        s4: { kind: "score", text: "25" },
        s5: { kind: "excused" },
      },
      20,
    );
    expect(marks).toEqual({ s1: { status: "graded", score: 14.5 }, s2: { status: "absent" }, s5: { status: "excused" } });
    expect(invalid).toEqual(["s4"]);
  });

  it("préscolaire : niveaux d'acquisition", () => {
    expect(cellsToMarks({ s1: { kind: "level", level: "in_progress" } }, null).marks).toEqual({
      s1: { status: "graded", acquisition: "in_progress" },
    });
  });

  it("aller-retour avec la feuille du serveur", () => {
    const marks = { s1: { status: "graded" as const, score: 9.75 }, s2: { status: "excused" as const } };
    expect(marksToCells(marks)).toEqual({ s1: { kind: "score", text: "9,75" }, s2: { kind: "excused" } });
    expect(cellsToMarks(marksToCells(marks), 20).marks).toEqual(marks);
    expect(formatScore(12)).toBe("12");
  });
});

describe("resolveSheet", () => {
  const server = { enteredAt: "2026-11-10T10:00:00.000Z", marks: { s1: { status: "graded" as const, score: 12 } } };

  it("la saisie du téléphone plus récente l'emporte", () => {
    const draft = { cells: { s1: { kind: "score" as const, text: "13" } }, savedAt: null, updatedAt: "2026-11-10T11:00:00.000Z" };
    expect(resolveSheet(server, draft)).toEqual({ cells: draft.cells, savedAt: null });
  });

  it("une saisie plus ancienne que celle du serveur (autre téléphone) est ignorée", () => {
    const draft = { cells: {}, savedAt: null, updatedAt: "2026-11-10T09:00:00.000Z" };
    expect(resolveSheet(server, draft)).toEqual({ cells: { s1: { kind: "score", text: "12" } }, savedAt: server.enteredAt });
  });
});

describe("sheetStats", () => {
  it("compte les notes de la liste et calcule moyenne, plus haute et plus basse", () => {
    const stats = sheetStats(
      {
        s1: { status: "graded", score: 14 },
        s2: { status: "graded", score: 9.5 },
        s3: { status: "absent" },
        gone: { status: "graded", score: 20 },
      },
      ["s1", "s2", "s3", "s4"],
    );
    expect(stats).toMatchObject({ graded: 2, absent: 1, excused: 0, missing: 1, average: 11.75, highest: 14, lowest: 9.5 });
  });
});
