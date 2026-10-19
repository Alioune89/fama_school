import "server-only";
import { cookies } from "next/headers";
import { ACTIVE_SCHOOL_COOKIE, getCurrentUser, type CurrentUser } from "./session";
import type { AppRole } from "./spaces";

export type SchoolContext = {
  user: CurrentUser;
  schoolId: string;
  schoolName: string;
  roles: AppRole[];
};

/**
 * École active pour un espace « par école » (direction ou professeur), sans redirection :
 * utilisable dans les Server Actions, qui renvoient alors une erreur « forbidden ».
 */
export async function getSchoolContext(space: "direction" | "professeur"): Promise<SchoolContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const candidates = user.spaces.filter((entry) => entry.space === space && entry.schoolId);
  if (candidates.length === 0) return null;

  const activeSchoolId = (await cookies()).get(ACTIVE_SCHOOL_COOKIE)?.value;
  const entry = candidates.find((candidate) => candidate.schoolId === activeSchoolId) ?? candidates[0]!;
  return { user, schoolId: entry.schoolId!, schoolName: entry.schoolName ?? "", roles: entry.roles };
}
