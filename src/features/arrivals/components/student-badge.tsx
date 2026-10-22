import QRCode from "qrcode";
import { CircleCheck, LogOut, Printer } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { todayInDakar } from "@/features/dashboard/calendar";
import { Link } from "@/i18n/navigation";
import { formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { badgeText } from "../badge";
import { listArrivals, listDepartures } from "../queries";
import { RenewBadgeButton } from "./renew-badge-button";

/** Carte d'élève sur sa fiche : QR code, arrivée et sortie du jour, impression et remplacement d'une carte perdue. */
export async function StudentBadge({ studentId, name, canRenew }: { studentId: string; name: string; canRenew: boolean }) {
  const supabase = await createClient();
  const [{ data: student }, arrivals, departures, t, tArrivals] = await Promise.all([
    supabase.from("students").select("badge_token").eq("id", studentId).maybeSingle(),
    listArrivals({ studentIds: [studentId] }, todayInDakar()),
    listDepartures({ studentIds: [studentId] }, todayInDakar()),
    getTranslations("arrivals.badge"),
    getTranslations("arrivals"),
  ]);
  if (!student) return null;
  const svg = await QRCode.toString(badgeText(student.badge_token), { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const arrivedAt = arrivals.get(studentId);
  const leftAt = departures.get(studentId);

  return (
    <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70" aria-labelledby="student-badge">
      <h2 id="student-badge" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("hint")}</p>
      <div className="mt-4 flex items-center gap-4">
        <div
          role="img"
          aria-label={tArrivals("cardsPage.qrLabel", { name })}
          className="size-24 shrink-0 rounded-lg bg-white p-1.5 ring-1 ring-line [&_svg]:size-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 space-y-2">
          {arrivedAt && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-success-700">
              <CircleCheck className="size-4" aria-hidden />
              {tArrivals("parentArrivedToday", { time: formatTime(arrivedAt) })}
            </p>
          )}
          {leftAt && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-azure-700">
              <LogOut className="size-4" aria-hidden />
              {tArrivals("parentLeftToday", { time: formatTime(leftAt) })}
            </p>
          )}
          <Link
            href={`/direction/presences/cartes?eleve=${studentId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Printer aria-hidden />
            {t("print")}
          </Link>
          {canRenew && <RenewBadgeButton studentId={studentId} />}
        </div>
      </div>
    </section>
  );
}
