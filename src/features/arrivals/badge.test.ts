import { describe, expect, it } from "vitest";
import { badgeText, isRepeatScan, parseBadge, RESCAN_DELAY_MS } from "./badge";

const token = "0123456789abcdef0123456789abcdef";

describe("parseBadge", () => {
  it("lit le jeton d'une carte", () => {
    expect(parseBadge(badgeText(token))).toBe(token);
    expect(parseBadge(` ${badgeText(token)}\n`)).toBe(token);
  });

  it("écarte les autres QR codes", () => {
    expect(parseBadge("https://example.com")).toBeNull();
    expect(parseBadge(token)).toBeNull();
    expect(parseBadge("FS1-0123")).toBeNull();
    expect(parseBadge(`FS1-${token.toUpperCase()}`)).toBeNull();
  });
});

describe("isRepeatScan", () => {
  it("ignore la même carte restée devant la caméra", () => {
    expect(isRepeatScan({ token, at: 1000 }, token, 1000 + RESCAN_DELAY_MS - 1)).toBe(true);
  });

  it("relit la carte après le délai, ou une autre carte aussitôt", () => {
    expect(isRepeatScan({ token, at: 1000 }, token, 1000 + RESCAN_DELAY_MS)).toBe(false);
    expect(isRepeatScan({ token, at: 1000 }, "f".repeat(32), 1001)).toBe(false);
    expect(isRepeatScan(null, token, 0)).toBe(false);
  });
});
