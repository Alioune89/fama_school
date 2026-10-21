import { connection, NextResponse } from "next/server";

/**
 * Sonde de disponibilité (supervision, tests E2E). `commit` (fourni par Vercel) permet d'attendre
 * qu'un déploiement serve bien le code poussé avant de le tester.
 */
export async function GET() {
  await connection();
  return NextResponse.json({ status: "ok", service: "fama-school", commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
}
