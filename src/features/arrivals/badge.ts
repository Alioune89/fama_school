/**
 * Contenu du QR code des cartes d'élève : « FS1- » suivi du jeton aléatoire de l'élève
 * (students.badge_token). Le préfixe écarte les QR codes étrangers (affiches, emballages…).
 */
const PREFIX = "FS1-";
const BADGE = /^FS1-([0-9a-f]{32})$/;

export const badgeText = (token: string) => `${PREFIX}${token}`;

/** Jeton lu dans un QR code, ou null si ce n'est pas une carte Fama School. */
export function parseBadge(text: string): string | null {
  return BADGE.exec(text.trim())?.[1] ?? null;
}

/** Délai pendant lequel la même carte, restée devant la caméra, n'est pas relue. */
export const RESCAN_DELAY_MS = 4000;

/** Une carte vue il y a moins de RESCAN_DELAY_MS est ignorée (lecture en continu de la caméra). */
export function isRepeatScan(last: { token: string; at: number } | null, token: string, now: number) {
  return last !== null && last.token === token && now - last.at < RESCAN_DELAY_MS;
}
