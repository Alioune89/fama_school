import { connection, NextResponse } from "next/server";

/** Sonde de disponibilité (supervision, tests E2E). */
export async function GET() {
  await connection();
  return NextResponse.json({ status: "ok", service: "fama-school" });
}
