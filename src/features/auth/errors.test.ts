import { describe, expect, it } from "vitest";
import { mapAuthError, safeNextPath } from "./errors";

describe("mapAuthError", () => {
  it.each([
    [{ code: "otp_expired" }, "invalidCode"],
    [{ code: "invalid_credentials" }, "invalidCredentials"],
    [{ code: "over_sms_send_rate_limit" }, "rateLimited"],
    [{ code: "sms_send_failed" }, "smsFailed"],
    [{ status: 429 }, "rateLimited"],
    [{ code: "something_new" }, "unknown"],
  ] as const)("%o → %s", (error, expected) => {
    expect(mapAuthError(error)).toBe(expected);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/direction/eleves", "/direction/eleves"],
    ["/parent?enfant=1", "/parent?enfant=1"],
    ["https://evil.example", null],
    ["//evil.example", null],
    ["/\\evil.example", null],
    ["/connexion", null],
    ["", null],
    [null, null],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
