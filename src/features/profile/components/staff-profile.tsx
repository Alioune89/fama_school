import { Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PersonAvatar } from "@/components/people/person-avatar";
import { AvailabilityForm } from "@/features/messaging/components/availability-form";
import { getAvailabilities } from "@/features/messaging/queries";
import { NotificationSettingsForm } from "@/features/notifications/components/notification-settings-form";
import { getNotificationSettings } from "@/features/notifications/queries";
import type { CurrentUser } from "@/lib/auth/session";
import { formatPhone } from "@/lib/phone";
import { PasswordForm } from "./password-form";

/**
 * Profil du personnel (direction et professeurs) : identité, écoles et rôles, mot de passe des comptes
 * e-mail, notifications et, pour les professeurs, horaires de réponse aux parents.
 */
export async function StaffProfile({ user, teacher }: { user: CurrentUser; teacher: boolean }) {
  const [t, tRoles, settings, availabilities] = await Promise.all([
    getTranslations("profile"),
    getTranslations("roles"),
    getNotificationSettings(user.id),
    teacher ? getAvailabilities([user.id]) : null,
  ]);
  const name = user.fullName ?? (user.phone ? formatPhone(user.phone) : (user.email ?? ""));

  const schools = new Map<string, { name: string; roles: string[] }>();
  for (const membership of user.memberships) {
    if (membership.role === "parent") continue;
    const school = schools.get(membership.schoolId) ?? { name: membership.schoolName, roles: [] };
    school.roles.push(tRoles(membership.role));
    schools.set(membership.schoolId, school);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-6">
        <section aria-labelledby="identity" className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
          <div className="flex items-center gap-4">
            <PersonAvatar name={name} size="lg" />
            <div className="min-w-0">
              <h2 id="identity" className="truncate text-lg font-semibold">
                {name}
              </h2>
              <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {user.phone && (
                  <li className="tabular flex items-center gap-1.5">
                    <Phone className="size-4" aria-hidden />
                    {formatPhone(user.phone)}
                  </li>
                )}
                {user.email && (
                  <li className="flex items-center gap-1.5 break-all">
                    <Mail className="size-4 shrink-0" aria-hidden />
                    {user.email}
                  </li>
                )}
              </ul>
            </div>
          </div>
          {schools.size > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-ink">{t("schools")}</h3>
              <ul className="mt-2 divide-y divide-line">
                {[...schools.entries()].map(([id, school]) => (
                  <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="font-medium text-ink">{school.name}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {school.roles.map((role) => (
                        <StatusPill key={role} tone="lavender">
                          {role}
                        </StatusPill>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-4 text-xs text-muted-foreground">{t("identityHint")}</p>
        </section>
        {user.email && <PasswordForm />}
        {availabilities && <AvailabilityForm initial={availabilities.get(user.id)!} />}
      </div>
      <NotificationSettingsForm initial={settings} />
    </div>
  );
}
