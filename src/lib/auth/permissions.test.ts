import { describe, expect, it } from "vitest";
import { permissions } from "./permissions";

describe("permissions (miroir de la RLS)", () => {
  it("réserve l'identité de l'école au fondateur et au directeur", () => {
    expect(permissions.manageSchool(["director"])).toBe(true);
    expect(permissions.manageSchool(["censor", "secretary"])).toBe(false);
  });

  it("confie la structure pédagogique à la direction des études", () => {
    expect(permissions.manageAcademics(["censor"])).toBe(true);
    expect(permissions.manageAcademics(["secretary"])).toBe(false);
  });

  it("confie les inscriptions au secrétariat", () => {
    expect(permissions.managePeople(["secretary"])).toBe(true);
    expect(permissions.managePeople(["teacher", "accountant"])).toBe(false);
    expect(permissions.takeAttendance(["supervisor"])).toBe(true);
    expect(permissions.takeAttendance(["secretary", "accountant", "teacher"])).toBe(false);
  });

  it("limite qui peut ajouter qui au répertoire", () => {
    expect(permissions.inviteRole(["secretary"], "teacher")).toBe(true);
    expect(permissions.inviteRole(["secretary"], "director")).toBe(false);
    expect(permissions.inviteRole(["director"], "accountant")).toBe(true);
    expect(permissions.inviteRole(["director"], "owner")).toBe(false);
    expect(permissions.inviteRole(["owner"], "owner")).toBe(true);
  });
});
