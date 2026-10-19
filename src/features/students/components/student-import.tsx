"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMessage } from "@/components/forms/use-action-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { importStudents, type ImportResult } from "@/features/students/actions";
import { IMPORT_TEMPLATE_CSV, parseImport, type CellValue, type ParsedImport } from "@/features/students/import-parser";
import { Link } from "@/i18n/navigation";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const BATCH_SIZE = 250;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const normalizeClass = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");

/** Lecture du fichier dans le navigateur : rien n'est envoyé avant la confirmation. */
async function readFile(file: File): Promise<CellValue[][]> {
  if (/\.(xlsx)$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as CellValue[][];
  }
  const Papa = (await import("papaparse")).default;
  const content = await file.text();
  const result = Papa.parse<string[]>(content.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    delimitersToGuess: [";", ",", "\t"],
  });
  return result.data;
}

type Step =
  | { kind: "pick" }
  | { kind: "preview"; fileName: string; parsed: ParsedImport }
  | { kind: "done"; result: ImportResult; skipped: number };

export function StudentImport({ classNames }: { classNames: string[] }) {
  const t = useTranslations("students.import");
  const tIssues = useTranslations("students.import.issues");
  const message = useMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [readError, setReadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);

  const knownClasses = new Set(classNames.map(normalizeClass));

  const handleFile = async (file: File | undefined) => {
    setReadError(null);
    if (!file) return;
    if (!/\.(xlsx|csv|txt)$/i.test(file.name)) return setReadError(t("unsupported"));
    if (file.size > MAX_FILE_BYTES) return setReadError(t("tooLarge"));
    try {
      const sheet = await readFile(file);
      const parsed = parseImport(sheet);
      if (parsed.valid.length === 0 && parsed.invalid.length === 0) return setReadError(t("empty"));
      setStep({ kind: "preview", fileName: file.name, parsed });
    } catch {
      setReadError(t("unreadable"));
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + IMPORT_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-import-eleves.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep({ kind: "pick" });
    setSubmitError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (step.kind === "done") {
    const { result, skipped } = step;
    return (
      <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-50 text-success-700">
            <CheckCircle2 className="size-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold">{t("doneTitle", { count: result.imported })}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("doneHint")}</p>
          </div>
        </div>
        {(result.errors.length > 0 || skipped > 0) && (
          <div className="mt-5 rounded-xl bg-warning-50 p-4 text-sm text-warning-700">
            <p className="font-semibold">{t("notImported", { count: result.errors.length + skipped })}</p>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {result.errors.map((error) => (
                  <li key={error.row}>
                    {t("rowError", { row: error.row })}{" "}
                    {message(error.code === "unknown" ? "errors.unknown" : `students.errors.${error.code}`)}
                  </li>
                ))}
              </ul>
            )}
            {skipped > 0 && <p className="mt-2">{t("skippedHint", { count: skipped })}</p>}
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/direction/eleves" className={buttonVariants()}>
            {t("seeStudents")}
          </Link>
          <Button variant="outline" onClick={reset}>
            <RotateCcw aria-hidden />
            {t("again")}
          </Button>
        </div>
      </section>
    );
  }

  if (step.kind === "preview") {
    const { parsed, fileName } = step;
    const unknownClassRows = parsed.valid.filter((row) => !knownClasses.has(normalizeClass(row.className)));
    const unknownClasses = [...new Set(unknownClassRows.map((row) => row.className))];
    const importable = parsed.valid.filter((row) => knownClasses.has(normalizeClass(row.className)));
    const skipped = parsed.invalid.length + unknownClassRows.length;

    const submit = () => {
      setSubmitError(null);
      startTransition(async () => {
        const total: ImportResult = { imported: 0, errors: [] };
        for (let i = 0; i < importable.length; i += BATCH_SIZE) {
          const result = await importStudents({ rows: importable.slice(i, i + BATCH_SIZE) });
          if (!result.ok) {
            // Les lots déjà envoyés restent inscrits : on affiche le bilan partiel.
            if (total.imported === 0) return setSubmitError(message(result.error) ?? null);
            break;
          }
          total.imported += result.data.imported;
          total.errors.push(...result.data.errors);
          setProgress(Math.round(((i + BATCH_SIZE) / importable.length) * 100));
        }
        setStep({ kind: "done", result: total, skipped });
      });
    };

    return (
      <div className="space-y-5">
        <section className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
          <span className="flex size-11 items-center justify-center rounded-xl bg-azure-50 text-azure-700">
            <FileSpreadsheet className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{fileName}</p>
            <p className="text-sm text-muted-foreground">{t("summary", { valid: importable.length, skipped })}</p>
          </div>
          <Button variant="ghost" onClick={reset} disabled={pending}>
            {t("changeFile")}
          </Button>
        </section>

        {parsed.missingRequired.length > 0 && (
          <Notice tone="danger" title={t("missingColumns")}>
            {t("missingColumnsHint", { columns: parsed.missingRequired.map((field) => t(`fields.${field}`)).join(", ") })}
          </Notice>
        )}

        {unknownClasses.length > 0 && (
          <Notice tone="warning" title={t("unknownClasses", { count: unknownClassRows.length })}>
            {t("unknownClassesHint", { classes: unknownClasses.join(", ") })}{" "}
            <Link href="/direction/parametres/classes" className="font-semibold underline">
              {t("manageClasses")}
            </Link>
          </Notice>
        )}

        {parsed.invalid.length > 0 && (
          <Notice tone="warning" title={t("invalidRows", { count: parsed.invalid.length })}>
            <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto">
              {parsed.invalid.map((row) => (
                <li key={row.row}>
                  {t("rowError", { row: row.row })} <span className="font-medium">{row.label}</span> —{" "}
                  {row.issues.map((issue) => tIssues(issue)).join(", ")}
                </li>
              ))}
            </ul>
          </Notice>
        )}

        {importable.length > 0 && (
          <section className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-line/70">
            <h2 className="border-b border-line px-5 py-4 text-sm font-semibold">
              {t("previewTitle", { count: Math.min(importable.length, 8), total: importable.length })}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-azure-50 text-xs font-semibold text-ink-soft">
                  <tr>
                    <th scope="col" className="px-5 py-3">
                      {t("fields.lastName")}
                    </th>
                    <th scope="col" className="px-5 py-3">
                      {t("fields.firstName")}
                    </th>
                    <th scope="col" className="px-5 py-3">
                      {t("fields.sex")}
                    </th>
                    <th scope="col" className="px-5 py-3">
                      {t("fields.className")}
                    </th>
                    <th scope="col" className="px-5 py-3">
                      {t("fields.guardian")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {importable.slice(0, 8).map((row) => (
                    <tr key={row.row}>
                      <td className="px-5 py-3 font-medium">{row.student.last_name}</td>
                      <td className="px-5 py-3">{row.student.first_name}</td>
                      <td className="px-5 py-3">{row.student.sex}</td>
                      <td className="px-5 py-3">{row.className}</td>
                      <td className="px-5 py-3 text-ink-soft">
                        {row.guardians[0]
                          ? `${row.guardians[0].full_name}${row.guardians[0].phone ? ` · ${formatPhone(row.guardians[0].phone)}` : ""}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {submitError && <Notice tone="danger" title={submitError} />}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button size="lg" variant="sun" onClick={submit} disabled={pending || importable.length === 0}>
            <Upload aria-hidden />
            {t("confirm", { count: importable.length })}
          </Button>
          {pending && <Progress value={progress} className="sm:w-64" aria-label={t("progress")} />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <label
        htmlFor="student-import-file"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-white px-6 py-14 text-center shadow-card transition-colors hover:border-azure-400 hover:bg-azure-50/50",
          dragging && "border-azure-500 bg-azure-50",
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-azure-50 text-azure-700">
          <Upload className="size-7" aria-hidden strokeWidth={1.75} />
        </span>
        <span className="mt-4 text-lg font-semibold">{t("dropTitle")}</span>
        <span className="mt-1 text-sm text-muted-foreground">{t("dropHint")}</span>
        <input
          ref={inputRef}
          id="student-import-file"
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </label>
      {readError && <Notice tone="danger" title={readError} />}

      <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
        <h2 className="font-semibold">{t("howTitle")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          <li>{t("howColumns")}</li>
          <li>{t("howClasses")}</li>
          <li>{t("howParents")}</li>
          <li>{t("howDates")}</li>
        </ul>
        <Button variant="outline" className="mt-4" onClick={downloadTemplate}>
          <Download aria-hidden />
          {t("template")}
        </Button>
      </section>
    </div>
  );
}

function Notice({ tone, title, children }: { tone: "warning" | "danger"; title: string; children?: React.ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl p-4 text-sm",
        tone === "danger" ? "bg-danger-50 text-danger-700" : "bg-warning-50 text-warning-700",
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1">{children}</div>}
      </div>
    </div>
  );
}
