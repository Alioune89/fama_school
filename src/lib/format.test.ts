import { describe, expect, it } from "vitest";
import { formatDate, formatInteger, formatTime, formatXOF, initials } from "./format";

// Intl insère des espaces insécables (fines ou non) : on les compare comme des espaces simples.
const plain = (value: string) => value.replace(/[  ]/g, " ");

describe("formatXOF", () => {
  it("formate un montant entier en FCFA", () => {
    expect(plain(formatXOF(125000))).toBe("125 000 FCFA");
  });

  it("gère les grands montants (bigint)", () => {
    expect(plain(formatXOF(200_000_000n))).toBe("200 000 000 FCFA");
  });

  it("refuse les montants à virgule", () => {
    expect(() => formatXOF(1500.5)).toThrow(RangeError);
  });
});

describe("formatInteger", () => {
  it("sépare les milliers", () => {
    expect(plain(formatInteger(3250))).toBe("3 250");
  });
});

describe("formatDate", () => {
  it("affiche la date en français, fuseau de Dakar", () => {
    expect(formatDate("2026-10-05T23:30:00Z")).toBe("5 octobre 2026");
  });
});

describe("formatTime", () => {
  it("affiche l'heure de Dakar à la sénégalaise", () => {
    expect(formatTime("2026-10-21T08:05:00Z")).toBe("8 h 05");
    expect(formatTime("2026-10-21T17:30:00Z")).toBe("17 h 30");
  });
});

describe("initials", () => {
  it.each([
    ["Awa Diop", "AD"],
    ["Mame Diarra Bousso Ndiaye", "MN"],
    ["Fatou", "F"],
    ["", "?"],
    [null, "?"],
  ])("« %s » → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
