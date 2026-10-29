"use client";

import { useRef, useState, useTransition } from "react";
import { Check, ExternalLink, Eye, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm, useMessage } from "@/components/forms/use-action-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPhone } from "@/lib/phone";
import { addSitePhoto, removeSitePhoto, saveSite, setSitePublished } from "../actions";
import type { SiteEditorData } from "../queries";
import { ACCENT_COLORS, SITE_LIMITS } from "../schemas";
import { uploadSitePhoto } from "../upload";

const card = "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6";

/** Éditeur du site vitrine : publication, contenu, photos. En lecture seule pour qui ne peut pas publier. */
export function SiteEditor({ data, schoolId, canEdit }: { data: SiteEditorData; schoolId: string; canEdit: boolean }) {
  const t = useTranslations("schoolSite");
  const message = useMessage();
  const [tagline, setTagline] = useState(data.tagline);
  const [about, setAbout] = useState(data.about);
  const [admissions, setAdmissions] = useState(data.admissions);
  const [whatsapp, setWhatsapp] = useState(formatPhone(data.whatsapp));
  const [accentColor, setAccentColor] = useState(data.accentColor);
  const [stats, setStats] = useState(data.stats);
  const [fees, setFees] = useState(data.fees.map((fee) => ({ label: fee.label, amount: String(fee.amount) })));
  const [faq, setFaq] = useState(data.faq);
  const [publishing, startPublish] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const heroInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const form = useActionForm(saveSite, { onSuccess: () => toast.success(t("saved")) });
  const publicPath = `/ecoles/${data.slug}`;

  const togglePublished = () =>
    startPublish(async () => {
      const result = await setSitePublished({ published: !data.published });
      if (result.ok) toast.success(t(data.published ? "unpublishedToast" : "publishedToast"));
      else toast.error(message(result.error));
    });

  const onPhoto = (kind: "hero" | "gallery", files: FileList | null) => {
    if (!files?.length) return;
    setPhotoError(null);
    startUpload(async () => {
      for (const file of kind === "hero" ? [files[0]!] : Array.from(files)) {
        const uploaded = await uploadSitePhoto(file, schoolId);
        if ("error" in uploaded) {
          setPhotoError(t(`photoErrors.${uploaded.error}`));
          return;
        }
        const result = await addSitePhoto({ kind, path: uploaded.path });
        if (!result.ok) {
          setPhotoError(message(result.error) ?? null);
          return;
        }
      }
      toast.success(t("photoAdded"));
    });
  };

  const onRemovePhoto = (path: string) =>
    startUpload(async () => {
      const result = await removeSitePhoto({ path });
      if (!result.ok) setPhotoError(message(result.error) ?? null);
    });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    form.run({
      tagline,
      about,
      admissions,
      whatsapp,
      accentColor,
      stats,
      fees: fees.map((fee) => ({ label: fee.label, amount: Number(fee.amount.replace(/\s/g, "")) })),
      faq,
    });
  };

  const rowError = (prefix: string) => (form.hasErrorUnder(prefix) ? t("rowInvalid") : undefined);

  return (
    <div className="space-y-6">
      <section className={`${card} flex flex-wrap items-center justify-between gap-4`} aria-labelledby="site-status">
        <div className="space-y-1">
          <h2 id="site-status" className="flex items-center gap-2 text-base font-semibold">
            <span className={`size-2.5 rounded-full ${data.published ? "bg-success-500" : "bg-line"}`} aria-hidden />
            {t(data.published ? "statusPublished" : "statusDraft")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {data.published ? t("publishedHint", { url: publicPath }) : t("draftHint")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${publicPath}?apercu=1`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            <Eye aria-hidden />
            {t("preview")}
          </a>
          {data.published && (
            <a href={publicPath} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              <ExternalLink aria-hidden />
              {t("viewSite")}
            </a>
          )}
          {canEdit && (
            <Button
              type="button"
              variant={data.published ? "outline" : "default"}
              onClick={togglePublished}
              disabled={publishing}
            >
              {data.published ? t("unpublish") : t("publish")}
            </Button>
          )}
        </div>
      </section>

      {!canEdit && <p className="rounded-xl bg-azure-50 px-4 py-3 text-sm text-azure-800">{t("readOnly")}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form noValidate onSubmit={submit} className="space-y-6">
          <fieldset disabled={!canEdit} className="space-y-6">
            <section className={`${card} space-y-5`}>
              <h2 className="text-base font-semibold">{t("sections.presentation")}</h2>
              <Field data-invalid={form.hasError("tagline") || undefined}>
                <FieldLabel htmlFor="tagline">{t("tagline")}</FieldLabel>
                <Input
                  id="tagline"
                  value={tagline}
                  maxLength={160}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder={t("taglinePlaceholder")}
                />
                <FieldError>{form.fieldError("tagline")}</FieldError>
              </Field>
              <Field data-invalid={form.hasError("about") || undefined}>
                <FieldLabel htmlFor="about">{t("about")}</FieldLabel>
                <Textarea
                  id="about"
                  rows={6}
                  value={about}
                  maxLength={3000}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder={t("aboutPlaceholder")}
                />
                <FieldError>{form.fieldError("about")}</FieldError>
              </Field>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("accentColor")}</legend>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(ACCENT_COLORS) as [keyof typeof ACCENT_COLORS, string][]).map(([name, color]) => (
                    <label key={color} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="accentColor"
                        value={color}
                        checked={accentColor === color}
                        onChange={() => setAccentColor(color)}
                        className="peer sr-only"
                        aria-label={t(`colors.${name}`)}
                      />
                      <span
                        className="flex size-9 items-center justify-center rounded-full ring-2 ring-transparent ring-offset-2 peer-checked:ring-ink peer-focus-visible:ring-azure-500"
                        style={{ backgroundColor: color }}
                      >
                        {accentColor === color && <Check className="size-4 text-white" aria-hidden />}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>

            <section className={`${card} space-y-4`}>
              <div>
                <h2 className="text-base font-semibold">{t("sections.stats")}</h2>
                <p className="text-sm text-muted-foreground">{t("statsHint")}</p>
              </div>
              {stats.map((stat, index) => (
                <Row
                  key={index}
                  error={rowError(`stats.${index}`)}
                  onRemove={() => setStats(stats.filter((_, i) => i !== index))}
                  removeLabel={t("removeRow")}
                >
                  <Input
                    aria-label={t("statValue")}
                    placeholder="98 %"
                    value={stat.value}
                    maxLength={20}
                    className="sm:w-28"
                    onChange={(e) => setStats(stats.map((s, i) => (i === index ? { ...s, value: e.target.value } : s)))}
                  />
                  <Input
                    aria-label={t("statLabel")}
                    placeholder={t("statLabelPlaceholder")}
                    value={stat.label}
                    maxLength={40}
                    onChange={(e) => setStats(stats.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)))}
                  />
                </Row>
              ))}
              {stats.length < SITE_LIMITS.stats && (
                <Button type="button" variant="outline" size="sm" onClick={() => setStats([...stats, { label: "", value: "" }])}>
                  <Plus aria-hidden />
                  {t("addStat")}
                </Button>
              )}
            </section>

            <section className={`${card} space-y-4`}>
              <div>
                <h2 className="text-base font-semibold">{t("sections.fees")}</h2>
                <p className="text-sm text-muted-foreground">{t("feesHint")}</p>
              </div>
              {fees.map((fee, index) => (
                <Row
                  key={index}
                  error={rowError(`fees.${index}`)}
                  onRemove={() => setFees(fees.filter((_, i) => i !== index))}
                  removeLabel={t("removeRow")}
                >
                  <Input
                    aria-label={t("feeLabel")}
                    placeholder={t("feeLabelPlaceholder")}
                    value={fee.label}
                    maxLength={80}
                    onChange={(e) => setFees(fees.map((f, i) => (i === index ? { ...f, label: e.target.value } : f)))}
                  />
                  <div className="relative sm:w-44">
                    <Input
                      aria-label={t("feeAmount")}
                      inputMode="numeric"
                      placeholder="25000"
                      value={fee.amount}
                      className="pr-14"
                      onChange={(e) =>
                        setFees(fees.map((f, i) => (i === index ? { ...f, amount: e.target.value.replace(/[^\d\s]/g, "") } : f)))
                      }
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      FCFA
                    </span>
                  </div>
                </Row>
              ))}
              {fees.length < SITE_LIMITS.fees && (
                <Button type="button" variant="outline" size="sm" onClick={() => setFees([...fees, { label: "", amount: "" }])}>
                  <Plus aria-hidden />
                  {t("addFee")}
                </Button>
              )}
            </section>

            <section className={`${card} space-y-5`}>
              <h2 className="text-base font-semibold">{t("sections.admissions")}</h2>
              <Field data-invalid={form.hasError("admissions") || undefined}>
                <FieldLabel htmlFor="admissions">{t("admissions")}</FieldLabel>
                <Textarea
                  id="admissions"
                  rows={5}
                  value={admissions}
                  maxLength={2000}
                  onChange={(e) => setAdmissions(e.target.value)}
                  placeholder={t("admissionsPlaceholder")}
                />
                <FieldDescription>{t("admissionsHint")}</FieldDescription>
                <FieldError>{form.fieldError("admissions")}</FieldError>
              </Field>
              <Field data-invalid={form.hasError("whatsapp") || undefined}>
                <FieldLabel htmlFor="whatsapp">{t("whatsapp")}</FieldLabel>
                <Input
                  id="whatsapp"
                  type="tel"
                  inputMode="tel"
                  placeholder="77 000 00 00"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
                <FieldDescription>{t("whatsappHint")}</FieldDescription>
                <FieldError>{form.fieldError("whatsapp")}</FieldError>
              </Field>
            </section>

            <section className={`${card} space-y-4`}>
              <h2 className="text-base font-semibold">{t("sections.faq")}</h2>
              {faq.map((item, index) => (
                <Row
                  key={index}
                  error={rowError(`faq.${index}`)}
                  onRemove={() => setFaq(faq.filter((_, i) => i !== index))}
                  removeLabel={t("removeRow")}
                  stacked
                >
                  <Input
                    aria-label={t("question")}
                    placeholder={t("questionPlaceholder")}
                    value={item.question}
                    maxLength={160}
                    onChange={(e) => setFaq(faq.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)))}
                  />
                  <Textarea
                    aria-label={t("answer")}
                    rows={2}
                    value={item.answer}
                    maxLength={1000}
                    onChange={(e) => setFaq(faq.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)))}
                  />
                </Row>
              ))}
              {faq.length < SITE_LIMITS.faq && (
                <Button type="button" variant="outline" size="sm" onClick={() => setFaq([...faq, { question: "", answer: "" }])}>
                  <Plus aria-hidden />
                  {t("addQuestion")}
                </Button>
              )}
            </section>
          </fieldset>

          <FormAlert message={form.formError} />
          {canEdit && (
            <Button type="submit" size="lg" disabled={form.pending}>
              {t("save")}
            </Button>
          )}
        </form>

        <aside className="space-y-6">
          <section className={`${card} space-y-4`}>
            <div>
              <h2 className="text-base font-semibold">{t("heroPhoto")}</h2>
              <p className="text-sm text-muted-foreground">{t("heroHint")}</p>
            </div>
            {data.hero ? (
              <Photo
                url={data.hero.url}
                alt={t("heroPhoto")}
                canEdit={canEdit}
                disabled={uploading}
                removeLabel={t("removePhoto")}
                onRemove={() => onRemovePhoto(data.hero!.path)}
                wide
              />
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-lg bg-azure-50 ring-1 ring-line">
                <ImagePlus className="size-8 text-azure-600" aria-hidden strokeWidth={1.5} />
              </div>
            )}
            {canEdit && (
              <>
                <input
                  ref={heroInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label={t("uploadHero")}
                  onChange={(e) => {
                    onPhoto("hero", e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" onClick={() => heroInput.current?.click()} disabled={uploading}>
                  <ImagePlus aria-hidden />
                  {data.hero ? t("replaceHero") : t("uploadHero")}
                </Button>
              </>
            )}
          </section>

          <section className={`${card} space-y-4`}>
            <div>
              <h2 className="text-base font-semibold">{t("gallery")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("galleryHint", { count: data.gallery.length, max: SITE_LIMITS.gallery })}
              </p>
            </div>
            {data.gallery.length > 0 && (
              <ul className="grid grid-cols-2 gap-2">
                {data.gallery.map((photo) => (
                  <li key={photo.path}>
                    <Photo
                      url={photo.url}
                      alt={t("galleryPhoto")}
                      canEdit={canEdit}
                      disabled={uploading}
                      removeLabel={t("removePhoto")}
                      onRemove={() => onRemovePhoto(photo.path)}
                    />
                  </li>
                ))}
              </ul>
            )}
            {canEdit && data.gallery.length < SITE_LIMITS.gallery && (
              <>
                <input
                  ref={galleryInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  aria-label={t("uploadGallery")}
                  onChange={(e) => {
                    onPhoto("gallery", e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" onClick={() => galleryInput.current?.click()} disabled={uploading}>
                  <Plus aria-hidden />
                  {t("uploadGallery")}
                </Button>
              </>
            )}
            {photoError && (
              <p role="alert" className="text-sm text-destructive">
                {photoError}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({
  children,
  error,
  onRemove,
  removeLabel,
  stacked,
}: {
  children: React.ReactNode;
  error?: string;
  onRemove: () => void;
  removeLabel: string;
  stacked?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <div className={stacked ? "grid flex-1 gap-2" : "flex flex-1 flex-col gap-2 sm:flex-row"}>{children}</div>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={removeLabel}>
          <Trash2 aria-hidden />
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Photo({
  url,
  alt,
  canEdit,
  disabled,
  removeLabel,
  onRemove,
  wide,
}: {
  url: string;
  alt: string;
  canEdit: boolean;
  disabled: boolean;
  removeLabel: string;
  onRemove: () => void;
  wide?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-lg ring-1 ring-line ${wide ? "aspect-[16/9]" : "aspect-square"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- photo servie par le stockage public Supabase */}
      <img src={url} alt={alt} className="size-full object-cover" />
      {canEdit && (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="absolute top-2 right-2"
          onClick={onRemove}
          disabled={disabled}
          aria-label={removeLabel}
        >
          <Trash2 aria-hidden />
        </Button>
      )}
    </div>
  );
}
