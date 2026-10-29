"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { saveDailyReport } from "../actions";
import { DAILY_REPORT_BUCKET, MAX_AUDIO_SECONDS } from "../bucket";

type Audio = { url: string; seconds: number; blob?: Blob; path?: string };

const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Format d'enregistrement accepté par le navigateur (Opus/WebM, ou AAC/MP4 sur iPhone). */
function recordingType() {
  if (typeof MediaRecorder === "undefined") return null;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

/**
 * Rapport du jour : quelques lignes et/ou une note vocale (2 minutes au plus), enregistrée sur place.
 * La note est envoyée au stockage privé au moment d'enregistrer le rapport.
 */
export function DailyReportForm({
  schoolId,
  userId,
  initial,
}: {
  schoolId: string;
  userId: string;
  initial: { body: string; audio: { url: string; path: string; seconds: number } | null } | null;
}) {
  const t = useTranslations("dailyReports");
  const [body, setBody] = useState(initial?.body ?? "");
  const [audio, setAudio] = useState<Audio | null>(initial?.audio ?? null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const form = useActionForm(saveDailyReport, { onSuccess: () => toast.success(t("saved")) });

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function start() {
    setMicError(null);
    const type = recordingType();
    if (type === null || !navigator.mediaDevices?.getUserMedia) {
      setMicError(t("errors.noRecorder"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      media.ondataavailable = (event) => event.data.size > 0 && chunks.current.push(event.data);
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: media.mimeType.split(";")[0] || "audio/webm" });
        setAudio({ url: URL.createObjectURL(blob), seconds: Math.max(1, elapsedRef.current), blob });
      };
      recorder.current = media;
      media.start();
      setRecording(true);
      setElapsed(0);
      elapsedRef.current = 0;
      timer.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_AUDIO_SECONDS) stop();
      }, 1000);
    } catch {
      setMicError(t("errors.micDenied"));
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    setRecording(false);
  }

  async function submit() {
    let audioPath = audio?.path ?? null;
    if (audio?.blob) {
      setUploading(true);
      const extension = audio.blob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${schoolId}/${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await createClient()
        .storage.from(DAILY_REPORT_BUCKET)
        .upload(path, audio.blob, { contentType: audio.blob.type === "audio/mp4" ? "audio/mp4" : "audio/webm" });
      setUploading(false);
      if (error) {
        setMicError(t("errors.uploadFailed"));
        return;
      }
      audioPath = path;
      setAudio({ ...audio, blob: undefined, path });
    }
    form.run({ body, audioPath, audioSeconds: audio ? audio.seconds : null });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      aria-labelledby="today-report"
      className="space-y-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70"
    >
      <h2 id="today-report" className="text-base font-semibold">
        {t("todayTitle")}
      </h2>
      <Field data-invalid={form.hasError("body") || undefined}>
        <FieldLabel htmlFor="report-body">{t("body")}</FieldLabel>
        <Textarea
          id="report-body"
          rows={4}
          maxLength={2000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("bodyPlaceholder")}
        />
        <FieldError>{form.fieldError("body")}</FieldError>
      </Field>

      <div className="rounded-xl p-4 ring-1 ring-line">
        <p className="text-sm font-semibold text-ink">{t("voiceTitle")}</p>
        <p className="mb-3 text-xs text-muted-foreground">{t("voiceHint", { max: MAX_AUDIO_SECONDS / 60 })}</p>
        {recording ? (
          <div className="flex items-center gap-3">
            <span className="size-3 animate-pulse rounded-full bg-danger-500" aria-hidden />
            <span className="tabular text-sm font-semibold" role="timer">
              {duration(elapsed)}
            </span>
            <Button type="button" variant="outline" onClick={stop}>
              <Square aria-hidden />
              {t("stop")}
            </Button>
          </div>
        ) : audio ? (
          <div className="flex flex-wrap items-center gap-3">
            <audio controls src={audio.url} className="h-10 max-w-full" aria-label={t("voicePlayer")} />
            <span className="text-xs text-muted-foreground">{duration(audio.seconds)}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAudio(null)}>
              <Trash2 aria-hidden />
              {t("removeVoice")}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => void start()}>
            <Mic aria-hidden />
            {t("record")}
          </Button>
        )}
      </div>

      <FormAlert message={micError ?? form.formError} />
      <Button type="submit" disabled={form.pending || uploading || recording}>
        {t(initial ? "update" : "send")}
      </Button>
    </form>
  );
}
