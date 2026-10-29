import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { processDeliveries } from "../deliveries";
import { listMyNotifications } from "../queries";
import { NotificationMenu } from "./notification-menu";

/** La cloche de la barre du haut, avec les notifications du compte connecté. */
export async function NotificationBell({ className }: { className: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  // Les envois par SMS et WhatsApp en attente partent après la page (sans la ralentir).
  after(() => processDeliveries().catch((error) => console.error("Envoi des notifications :", error)));
  const { items, unread } = await listMyNotifications();
  return <NotificationMenu userId={user.id} items={items} unread={unread} className={className} />;
}
