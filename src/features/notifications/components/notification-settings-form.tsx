"use client";

import { useState } from "react";
import { BellRing, MessageCircle, MessageSquareText } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { saveNotificationSettings } from "../actions";
import type { NotificationSettings } from "../queries";

/** Canaux de notification en plus de la cloche (l'envoi par SMS et WhatsApp arrive avec le Lot 6.4). */
export function NotificationSettingsForm({ initial }: { initial: NotificationSettings }) {
  const t = useTranslations("notifications.settings");
  const [values, setValues] = useState(initial);
  const form = useActionForm(saveNotificationSettings, { onSuccess: () => toast.success(t("saved")) });
  const channels = [
    { key: "push", icon: BellRing },
    { key: "whatsapp", icon: MessageCircle },
    { key: "sms", icon: MessageSquareText },
  ] as const;

  return (
    <section aria-labelledby="notification-settings" className="space-y-3">
      <h2 id="notification-settings" className="text-sm font-semibold text-ink">
        {t("title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      {channels.map(({ key, icon: Icon }) => (
        <label key={key} className="flex cursor-pointer items-start gap-4 rounded-xl bg-white p-4 ring-1 ring-line">
          <Icon className="mt-0.5 size-6 shrink-0 text-azure-700" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">{t(`${key}.title`)}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{t(`${key}.body`)}</span>
          </span>
          <Switch
            checked={values[key]}
            onCheckedChange={(checked) => setValues((current) => ({ ...current, [key]: checked }))}
            aria-label={t(`${key}.title`)}
          />
        </label>
      ))}
      <FormAlert message={form.formError} />
      <Button type="button" size="touch" className="w-full" disabled={form.pending} onClick={() => form.run(values)}>
        {t("save")}
      </Button>
    </section>
  );
}
