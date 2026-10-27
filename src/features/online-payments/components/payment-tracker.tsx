"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX, Download, LoaderCircle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Enums } from "@/lib/supabase/database.types";
import { refreshOnlinePayment } from "../actions";

type Status = Enums<"online_payment_status">;

/** Interroge le serveur toutes les 3 s pendant 2 min au plus, le temps que l'opérateur confirme. */
const POLL_MS = 3000;
const POLL_COUNT = 40;

/** Suivi d'un paiement en ligne au retour de la page de paiement : attente, confirmation et reçu, ou échec. */
export function PaymentTracker({
  id,
  initialStatus,
  initialPaymentId,
  checkoutUrl,
}: {
  id: string;
  initialStatus: Status;
  initialPaymentId: string | null;
  checkoutUrl: string | null;
}) {
  const t = useTranslations("onlinePayments");
  const [state, setState] = useState({ status: initialStatus, paymentId: initialPaymentId, polls: 0 });

  useEffect(() => {
    if (state.status !== "pending" || state.polls >= POLL_COUNT) return;
    const timer = setTimeout(
      async () => {
        const result = await refreshOnlinePayment(id).catch(() => null);
        setState((current) => ({
          status: result?.ok ? result.data.status : current.status,
          paymentId: result?.ok ? result.data.paymentId : current.paymentId,
          polls: current.polls + 1,
        }));
      },
      state.polls === 0 ? 0 : POLL_MS,
    );
    return () => clearTimeout(timer);
  }, [id, state.status, state.polls]);

  if (state.status === "succeeded") {
    return (
      <div role="status" className="space-y-4">
        <p className="flex items-center gap-2 text-lg font-semibold text-success-700">
          <CircleCheck className="size-6" aria-hidden />
          {t("succeeded")}
        </p>
        <p className="text-sm text-ink-soft">{t("succeededHint")}</p>
        {state.paymentId && (
          <a href={`/api/recus/${state.paymentId}`} className={buttonVariants({ size: "touch" })}>
            <Download aria-hidden />
            {t("downloadNow")}
          </a>
        )}
      </div>
    );
  }

  if (state.status === "failed" || state.status === "cancelled") {
    return (
      <div role="status" className="space-y-4">
        <p className="flex items-center gap-2 text-lg font-semibold text-danger-700">
          <CircleX className="size-6" aria-hidden />
          {t(state.status)}
        </p>
        <p className="text-sm text-ink-soft">{t("failedHint")}</p>
        <Link href="/parent/paiements" className={buttonVariants({ size: "touch" })}>
          <RotateCcw aria-hidden />
          {t("retry")}
        </Link>
      </div>
    );
  }

  const waitedLong = state.polls >= POLL_COUNT;
  return (
    <div role="status" className="space-y-4">
      <p className="flex items-center gap-2 text-lg font-semibold text-ink">
        {!waitedLong && <LoaderCircle className="size-6 animate-spin text-azure-600" aria-hidden />}
        {t("pending")}
      </p>
      <p className="text-sm text-ink-soft">{t(waitedLong ? "pendingLong" : "pendingHint")}</p>
      {checkoutUrl && (
        <a href={checkoutUrl} className={buttonVariants({ variant: "outline", size: "touch" })}>
          {t("resume")}
        </a>
      )}
    </div>
  );
}
