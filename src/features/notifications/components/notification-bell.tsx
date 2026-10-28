import { getCurrentUser } from "@/lib/auth/session";
import { listMyNotifications } from "../queries";
import { NotificationMenu } from "./notification-menu";

/** La cloche de la barre du haut, avec les notifications du compte connecté. */
export async function NotificationBell({ className }: { className: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { items, unread } = await listMyNotifications();
  return <NotificationMenu items={items} unread={unread} className={className} />;
}
