import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { badgeText } from "../badge";
import type { Badge } from "../queries";

export type CardSchool = { name: string; logoUrl: string | null; yearLabel: string | null };

/** QR code en SVG (texte généré par l'école, sans contenu fourni par l'utilisateur). */
const qrSvg = (token: string) => QRCode.toString(badgeText(token), { type: "svg", margin: 0, errorCorrectionLevel: "M" });

/**
 * Cartes d'élève au format carte bancaire (85,6 × 54 mm), 10 par feuille A4 à l'impression :
 * école, nom, classe, matricule et QR code de pointage.
 */
export async function BadgeCards({ badges, school }: { badges: Badge[]; school: CardSchool }) {
  const t = await getTranslations("arrivals.cardsPage");
  const svgs = await Promise.all(badges.map((badge) => qrSvg(badge.token)));
  return (
    <ul
      aria-label={t("listLabel")}
      className="grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2 print:grid-cols-[85.6mm_85.6mm] print:justify-center print:gap-x-[6mm] print:gap-y-[4mm]"
    >
      {badges.map((badge, index) => (
        <li
          key={badge.studentId}
          aria-label={`${badge.firstName} ${badge.lastName}`}
          className="flex h-[54mm] w-[85.6mm] break-inside-avoid flex-col overflow-hidden rounded-[3mm] bg-white ring-1 ring-line print:shadow-none print:ring-ink/30"
        >
          <div className="flex items-center gap-2 bg-azure-600 px-[4mm] py-[2mm] text-white print:[print-color-adjust:exact]">
            {school.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- logo servi par le stockage public Supabase
              <img src={school.logoUrl} alt="" className="size-[7mm] rounded-sm bg-white object-contain p-[0.5mm]" />
            )}
            <span className="min-w-0 flex-1 truncate text-[3.2mm] font-bold">{school.name}</span>
            {school.yearLabel && <span className="text-[2.6mm] opacity-90">{school.yearLabel}</span>}
          </div>
          <div className="flex flex-1 items-center gap-[3mm] px-[4mm] py-[2.5mm]">
            <div className="min-w-0 flex-1 space-y-[1mm]">
              <p className="text-[2.4mm] font-semibold tracking-wide text-ink-soft uppercase">{t("cardTitle")}</p>
              <p className="text-[4.2mm] leading-tight font-bold text-ink">{badge.firstName}</p>
              <p className="text-[4.2mm] leading-tight font-bold text-ink uppercase">{badge.lastName}</p>
              <p className="text-[3mm] text-ink-soft">{t("classLine", { className: badge.className })}</p>
              {badge.matricule && <p className="text-[2.6mm] text-ink-soft tabular-nums">{badge.matricule}</p>}
            </div>
            <div
              role="img"
              aria-label={t("qrLabel", { name: `${badge.firstName} ${badge.lastName}` })}
              className="size-[30mm] shrink-0 [&_svg]:size-full"
              dangerouslySetInnerHTML={{ __html: svgs[index]! }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
