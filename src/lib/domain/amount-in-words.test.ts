import { describe, expect, it } from "vitest";
import { amountInWords, numberInWords } from "./amount-in-words";

describe("numberInWords", () => {
  it.each([
    [0, "zéro"],
    [1, "un"],
    [16, "seize"],
    [17, "dix-sept"],
    [21, "vingt et un"],
    [22, "vingt-deux"],
    [70, "soixante-dix"],
    [71, "soixante et onze"],
    [77, "soixante-dix-sept"],
    [80, "quatre-vingts"],
    [81, "quatre-vingt-un"],
    [91, "quatre-vingt-onze"],
    [100, "cent"],
    [101, "cent un"],
    [200, "deux cents"],
    [280, "deux cent quatre-vingts"],
    [1000, "mille"],
    [1080, "mille quatre-vingts"],
    [2000, "deux mille"],
    [80000, "quatre-vingt mille"],
    [200000, "deux cent mille"],
    [250000, "deux cent cinquante mille"],
    [1000000, "un million"],
    [2500000, "deux millions cinq cent mille"],
    [1200300, "un million deux cent mille trois cents"],
    [3000000000, "trois milliards"],
  ])("%i → %s", (value, words) => {
    expect(numberInWords(value)).toBe(words);
  });

  it("refuse les nombres négatifs ou décimaux", () => {
    expect(() => numberInWords(-1)).toThrow(RangeError);
    expect(() => numberInWords(1.5)).toThrow(RangeError);
  });
});

describe("amountInWords", () => {
  it("francs CFA", () => {
    expect(amountInWords(30000)).toBe("trente mille francs CFA");
    expect(amountInWords(1)).toBe("un franc CFA");
    expect(amountInWords(1000000)).toBe("un million de francs CFA");
    expect(amountInWords(1500000)).toBe("un million cinq cent mille francs CFA");
  });
});
