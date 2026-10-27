"use client";

import { useState } from "react";
import { Camera, Check, MapPin, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { saveConsents } from "../actions";
import type { Consents } from "../consents";

/**
 * Langue et consentements : à la première connexion (« welcome », puis l'espace parent), ou depuis le profil.
 * Le traitement des données est indispensable ; photos et géolocalisation se refusent librement.
 */
export function ConsentForm({ initial, mode }: { initial: Consents; mode: "welcome" | "profile" }) {
  const t = useTranslations("consents");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState(initial.data);
  const [photos, setPhotos] = useState(initial.photos);
  const [location, setLocation] = useState(initial.location);
  const form = useActionForm(saveConsents, {
    onSuccess: () => {
      if (mode === "welcome") router.replace("/parent");
      else toast.success(t("saved"));
    },
  });

  const optional = [
    { key: "photos", icon: Camera, checked: photos, set: setPhotos },
    { key: "location", icon: MapPin, checked: location, set: setLocation },
  ] as const;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">{t("language")}</legend>
        <div role="radiogroup" aria-label={t("language")} className="grid grid-cols-2 gap-3">
          {routing.locales.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === locale}
              onClick={() => router.replace(pathname, { locale: option })}
              className={cn(
                "flex h-14 items-center justify-center gap-2 rounded-xl text-base font-semibold ring-1",
                option === locale ? "bg-azure-100 text-ink ring-2 ring-azure-500" : "bg-white text-ink-soft ring-line",
              )}
            >
              {option === locale && <Check className="size-5" aria-hidden />}
              {tCommon(`languages.${option}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-ink">{t("title")}</legend>
        <label className="flex cursor-pointer items-start gap-4 rounded-xl bg-white p-4 ring-1 ring-line">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-azure-700" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">{t("data.title")}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{t("data.body")}</span>
            <span className="mt-1 block text-xs font-medium text-ink-soft">{t("required")}</span>
          </span>
          <Switch checked={data} onCheckedChange={setData} aria-label={t("data.title")} />
        </label>
        {optional.map(({ key, icon: Icon, checked, set }) => (
          <label key={key} className="flex cursor-pointer items-start gap-4 rounded-xl bg-white p-4 ring-1 ring-line">
            <Icon className="mt-0.5 size-6 shrink-0 text-azure-700" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{t(`${key}.title`)}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{t(`${key}.body`)}</span>
              <span className="mt-1 block text-xs font-medium text-ink-soft">{t("optional")}</span>
            </span>
            <Switch checked={checked} onCheckedChange={set} aria-label={t(`${key}.title`)} />
          </label>
        ))}
        <p className="text-xs text-muted-foreground">{t("changeLater")}</p>
      </fieldset>

      <FormAlert message={form.fieldError("data") ?? form.formError} />
      <Button
        type="button"
        size="touch"
        className="w-full"
        disabled={form.pending || (mode === "welcome" && !data)}
        onClick={() => form.run({ data: data as true, photos, location, locale })}
      >
        {t(mode === "welcome" ? "continue" : "save")}
      </Button>
      {mode === "welcome" && !data && <p className="text-center text-sm text-muted-foreground">{t("dataNeeded")}</p>}
    </div>
  );
}
