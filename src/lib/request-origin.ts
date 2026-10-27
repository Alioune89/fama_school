import "server-only";
import { headers } from "next/headers";

/** Adresse du site telle que le visiteur l'a appelée (https://fama-school.vercel.app, http://localhost:3000). */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
