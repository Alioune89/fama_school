import type { getTranslations } from "next-intl/server";
import { amountInWords } from "@/lib/domain/amount-in-words";
import type { PaymentDetail } from "./queries";

/**
 * Reçu d'un encaissement (A5) : école, élève, montant en chiffres et en lettres, moyen de paiement,
 * factures réglées, signature, QR code de vérification. Composant sans état ni hook : aperçu et PDF.
 */

type Translator = Awaited<ReturnType<typeof getTranslations<"receipts">>>;

const xof = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;
const frDate = (value: string) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function ReceiptDocument({
  payment,
  t,
  verifyUrl,
  qrSvg,
  logoUrl,
}: {
  payment: PaymentDetail;
  t: Translator;
  verifyUrl: string;
  qrSvg: string;
  logoUrl: string | null;
}) {
  const { school } = payment;
  const contact = [school.address, school.city, school.phone, school.email].filter(Boolean).join(" · ");
  return (
    <section className="rr-page" lang="fr">
      <header className="rr-header">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- HTML statique du PDF, sans next/image.
          <img className="rr-logo" src={logoUrl} alt="" />
        ) : (
          <div className="rr-logo-placeholder" aria-hidden>
            {school.name.slice(0, 1)}
          </div>
        )}
        <div>
          <p className="rr-school">{school.name}</p>
          {contact && (
            <p className="rr-muted rr-small" style={{ margin: 0 }}>
              {contact}
            </p>
          )}
        </div>
      </header>

      <div className="rr-title">
        <h1>{t("title")}</h1>
        <span className="rr-number">{t("number", { number: payment.number })}</span>
      </div>

      <dl className="rr-grid rr-box">
        <dt>{t("date")}</dt>
        <dd>{frDate(payment.receivedOn)}</dd>
        <dt>{t("student")}</dt>
        <dd>
          {payment.studentName} · {payment.matricule}
          {payment.className && ` · ${payment.className}`}
        </dd>
        <dt>{t("method")}</dt>
        <dd>
          {t(`methods.${payment.method}`)}
          {payment.reference && ` · ${t("reference", { reference: payment.reference })}`}
        </dd>
        {payment.note && (
          <>
            <dt>{t("note")}</dt>
            <dd style={{ fontWeight: 400 }}>{payment.note}</dd>
          </>
        )}
      </dl>

      <div className="rr-amount">
        <span>{t("amount")}</span>
        <strong>{xof(payment.amount)}</strong>
      </div>
      <p className="rr-words">{t("inWords", { words: amountInWords(payment.amount) })}</p>

      <table className="rr-table">
        <thead>
          <tr>
            <th>{t("invoice")}</th>
            <th className="rr-num">{t("paidHere")}</th>
            <th className="rr-num">{t("remaining")}</th>
          </tr>
        </thead>
        <tbody>
          {payment.allocations.map((allocation) => (
            <tr key={allocation.invoiceId}>
              <td>
                {allocation.label} <span className="rr-muted rr-small">({allocation.number})</span>
              </td>
              <td className="rr-num">{xof(allocation.amount)}</td>
              <td className="rr-num">{allocation.remaining > 0 ? xof(allocation.remaining) : t("settled")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rr-signature rr-small">
        <div>{t("cashier")}</div>
      </div>

      <footer className="rr-footer rr-small">
        <div className="rr-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div>
          <p style={{ margin: 0, fontWeight: 700 }}>{t("verifyTitle")}</p>
          <p className="rr-muted" style={{ margin: "0.5mm 0 0" }}>
            {t("verifyHint")} <span className="rr-code">{verifyUrl}</span>
          </p>
        </div>
      </footer>

      {payment.status === "cancelled" && (
        <div className="rr-cancelled" aria-hidden>
          <span>{t("cancelledStamp")}</span>
        </div>
      )}
    </section>
  );
}
