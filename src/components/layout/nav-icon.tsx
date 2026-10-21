import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  CircleUserRound,
  ClipboardCheck,
  GraduationCap,
  House,
  Inbox,
  LayoutGrid,
  Megaphone,
  MessageSquareWarning,
  MessagesSquare,
  NotebookPen,
  Settings,
  Tags,
  UserRoundCheck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "@/config/navigation";

const ICONS: Record<NavIconName, LucideIcon> = {
  home: House,
  students: Users,
  teachers: GraduationCap,
  staff: UsersRound,
  classes: LayoutGrid,
  attendance: ClipboardCheck,
  grades: BookOpenCheck,
  finance: Wallet,
  announcements: Megaphone,
  calendar: CalendarDays,
  messages: MessagesSquare,
  profile: CircleUserRound,
  settings: Settings,
  rollCall: UserRoundCheck,
  programme: NotebookPen,
  homework: NotebookPen,
  children: UsersRound,
  payments: Wallet,
  schools: Building2,
  demoRequests: Inbox,
  plans: Tags,
  reports: MessageSquareWarning,
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden strokeWidth={1.75} />;
}
