import { NextResponse } from "next/server";
import { syncByProviderToken } from "@/features/online-payments/service";

/**
 * Notification de paiement PayDunya (IPN, formulaire « data[…] »). Seul le jeton est lu : le paiement est
 * ensuite confirmé auprès de l'API PayDunya, si bien qu'une notification forgée n'encaisse rien.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const token = form?.get("data[invoice][token]") ?? form?.get("token");
  if (typeof token !== "string" || !/^[\w-]{4,200}$/.test(token)) {
    return NextResponse.json({ error: "invalidNotification" }, { status: 400 });
  }
  const found = await syncByProviderToken("paydunya", token);
  return NextResponse.json({ received: found }, { status: found ? 200 : 404 });
}
