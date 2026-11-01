"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Info,
  CheckCircle2,
  Columns3,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMessage } from "@/components/forms/use-action-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { importStudents, saveImportColumns, type ImportResult } from "@/features/students/actions";
import {
  analyzeColumns,
  assignColumn,
  findDuplicates,
  findHeaderRow,
  IMPORT_FIELDS,
  isIgnoredHeader,
  IMPORT_TEMPLATE_CSV,
  missingFields,
  parseImport,
  type CellValue,
  type ColumnMapping,
  type ExistingStudent,
  type ImportColumn,
  type ImportField,
  type ImportSheet,
  type ParsedImport,
} from "@/features/students/import-parser";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const BATCH_SIZE = 250;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const normalizeClass = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");

/** Lecture du fichier dans le navigateur, toutes les feuilles : rien n'est envoyé avant la confirmation. */
async function readFile(file: File): Promise<ImportSheet[]> {
  if (/\.(xlsx)$/i.test(file.name)) {
    const readXlsxFile = (await import("read-excel-file/browser")).default;
    const sheets = await readXlsxFile(file);
    return sheets.map(({ sheet, data }) => ({ name: sheet, rows: data as CellValue[][] }));
  }
  const Papa = (await import("papaparse")).default;
  const content = await file.text();
  const result = Papa.parse<string[]>(content.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    delimitersToGuess: [";", ",", "\t"],
  });
  return [{ name: "", rows: result.data }];
}

/** Fichier lu : ses feuilles et ses colonnes. */
type Source = { fileName: string; sheets: ImportSheet[]; columns: ImportColumn[] };

type Step =
  | { kind: "pick" }
  | { kind: "columns"; source: Source; mapping: ColumnMapping; excluded: string[] }
  | { kind: "preview"; source: Source; mapping: ColumnMapping; excluded: string[]; parsed: ParsedImport }
  | { kind: "done"; result: ImportResult; skipped: number; lines: ParsedImport["lines"] };

export function StudentImport({
  classNames,
  existing,
  savedColumns,
}: {
  classNames: string[];
  existing: ExistingStudent[];
  /** Association des colonnes retenue aux imports précédents de l'école. */
  savedColumns: ColumnMapping;
}) {
  const t = useTranslations("students.import");
  const tIssues = useTranslations("students.import.issues");
  const tFields = useTranslations("students.import.fields");
  const message = useMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [readError, setReadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  // Lignes repérées comme doublons que l'utilisateur importe quand même (homonymes).
  const [allowed, setAllowed] = useState<Set<number>>(new Set());
  // Choix de colonnes de l'école, complétés à chaque import de la visite.
  const [knownColumns, setKnownColumns] = useState(savedColumns);

  const knownClasses = new Set(classNames.map(normalizeClass));
  const selectedSheets = (source: Source, excluded: string[]) => source.sheets.filter((sheet) => !excluded.includes(sheet.name));
  const rowLabel = (lines: ParsedImport["lines"], row: number) => {
    const where = lines.get(row);
    return where?.sheet ? t("rowErrorIn", { row: where.line, sheet: where.sheet }) : t("rowError", { row: where?.line ?? row });
  };

  const showPreview = (source: Source, mapping: ColumnMapping, excluded: string[]) => {
    const parsed = parseImport(selectedSheets(source, excluded), mapping);
    if (parsed.valid.length === 0 && parsed.invalid.length === 0) return setReadError(t("empty"));
    setReadError(null);
    setAllowed(new Set());
    setStep({ kind: "preview", source, mapping, excluded, parsed });
  };

  const handleFile = async (file: File | undefined) => {
    setReadError(null);
    if (!file) return;
    if (/\.xls$/i.test(file.name)) return setReadError(t("oldExcel"));
    if (!/\.(xlsx|csv|txt)$/i.test(file.name)) return setReadError(t("unsupported"));
    if (file.size > MAX_FILE_BYTES) return setReadError(t("tooLarge"));
    try {
      const sheets = (await readFile(file)).filter((sheet) => findHeaderRow(sheet.rows) >= 0);
      const { columns, mapping } = analyzeColumns(sheets, knownColumns);
      if (columns.length === 0) return setReadError(t("empty"));
      const source = { fileName: file.name, sheets, columns };
      // Tout est reconnu (ou déjà choisi par l'école) : directement l'aperçu. Sinon, l'école associe les colonnes.
      const resolved = columns.every(
        (column) => mapping[column.key] || column.key in knownColumns || isIgnoredHeader(column.key),
      );
      if (resolved && missingFields(sheets, mapping).length === 0) showPreview(source, mapping, []);
      else setStep({ kind: "columns", source, mapping, excluded: [] });
    } catch {
      setReadError(t("unreadable"));
    }
  };

  /** Retient ce que l'école a choisi elle-même (colonnes associées à la main ou laissées de côté). */
  const rememberColumns = (source: Source, mapping: ColumnMapping) => {
    const guessed = analyzeColumns(source.sheets).mapping;
    const chosen = Object.entries(mapping).filter(([key, field]) => field === null || field !== guessed[key]);
    if (chosen.length === 0) return;
    const next = { ...knownColumns, ...Object.fromEntries(chosen) };
    setKnownColumns(next);
    void saveImportColumns(next);
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
    const { result, skipped, lines } = step;
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
                    {rowLabel(lines, error.row)}{" "}
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

  if (step.kind === "columns") {
    const { source, mapping, excluded } = step;
    const sheets = selectedSheets(source, excluded);
    const missing = missingFields(sheets, mapping);
    const classSheets = !Object.values(mapping).includes("className") && missing.every((field) => field !== "className");
    const setMapping = (key: string, field: ImportField | null) =>
      setStep({ ...step, mapping: assignColumn(mapping, key, field) });
    const toggleSheet = (name: string, checked: boolean) =>
      setStep({ ...step, excluded: checked ? excluded.filter((other) => other !== name) : [...excluded, name] });

    return (
      <div className="space-y-5">
        <FileHeader fileName={source.fileName} onReset={reset} label={t("changeFile")}>
          {t("columnsSummary", { columns: source.columns.length, sheets: source.sheets.length })}
        </FileHeader>

        <section aria-labelledby="import-columns" className="rounded-xl bg-white shadow-card ring-1 ring-line/70">
          <div className="border-b border-line px-5 py-4">
            <h2 id="import-columns" className="flex items-center gap-2 font-semibold">
              <Columns3 className="size-4 text-azure-700" aria-hidden />
              {t("columnsTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("columnsHint")}</p>
          </div>
          <ul className="divide-y divide-line">
            {source.columns.map((column) => {
              const field = mapping[column.key] ?? null;
              const label = column.label || column.key;
              return (
                <li
                  key={column.key}
                  className={cn(
                    "grid gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_16rem] sm:items-center",
                    !field && !isIgnoredHeader(column.key) && "bg-warning-50/50",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {field ? t("recognized") : isIgnoredHeader(column.key) ? t("notNeeded") : t("toCheck")}
                    </p>
                  </div>
                  <p className="min-w-0 truncate text-sm text-ink-soft">
                    {column.samples.length > 0 ? column.samples.join(" · ") : t("noSamples")}
                  </p>
                  <NativeSelect
                    aria-label={t("fieldFor", { column: label })}
                    value={field ?? ""}
                    onChange={(event) => setMapping(column.key, (event.target.value || null) as ImportField | null)}
                  >
                    <option value="">{t("ignore")}</option>
                    {IMPORT_FIELDS.map((option) => (
                      <option key={option} value={option}>
                        {tFields(option)}
                      </option>
                    ))}
                  </NativeSelect>
                </li>
              );
            })}
          </ul>
        </section>

        {source.sheets.length > 1 && (
          <section aria-labelledby="import-sheets" className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <h2 id="import-sheets" className="font-semibold">
              {t("sheetsTitle")}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {source.sheets.map((sheet) => (
                <li key={sheet.name}>
                  <label className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-line">
                    <Checkbox
                      checked={!excluded.includes(sheet.name)}
                      onCheckedChange={(checked) => toggleSheet(sheet.name, checked === true)}
                    />
                    <span className="font-medium">{sheet.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {classSheets && sheets.length > 0 && (
          <Notice tone="info" title={t("classFromSheet")}>
            {t("classFromSheetHint", { sheets: sheets.map((sheet) => sheet.name).join(", ") })}
          </Notice>
        )}

        {missing.length > 0 && (
          <Notice tone="danger" title={t("missingColumns")}>
            {t("missingColumnsHint", { columns: missing.map((field) => tFields(field)).join(", ") })}
          </Notice>
        )}
        {readError && <Notice tone="danger" title={readError} />}

        <Button
          size="lg"
          onClick={() => showPreview(source, mapping, excluded)}
          disabled={missing.length > 0 || sheets.length === 0}
        >
          {t("continue")}
          <ArrowRight aria-hidden />
        </Button>
      </div>
    );
  }

  if (step.kind === "preview") {
    const { parsed, source, mapping, excluded } = step;
    const unknownClassRows = parsed.valid.filter((row) => !knownClasses.has(normalizeClass(row.className)));
    const unknownClasses = [...new Set(unknownClassRows.map((row) => row.className))];
    const candidates = parsed.valid.filter((row) => knownClasses.has(normalizeClass(row.className)));
    const duplicates = findDuplicates(candidates, existing);
    const held = new Set(duplicates.filter(({ row }) => !allowed.has(row.row)).map(({ row }) => row.row));
    const importable = candidates
      .filter((row) => !held.has(row.row))
      .map((row) => (allowed.has(row.row) ? { ...row, allowDuplicate: true } : row));
    const skipped = parsed.invalid.length + unknownClassRows.length + held.size;
    const toggleAllowed = (row: number, checked: boolean) =>
      setAllowed((current) => {
        const next = new Set(current);
        if (checked) next.add(row);
        else next.delete(row);
        return next;
      });

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
        if (total.imported > 0) rememberColumns(source, mapping);
        setStep({ kind: "done", result: total, skipped, lines: parsed.lines });
      });
    };

    return (
      <div className="space-y-5">
        <FileHeader fileName={source.fileName} onReset={reset} label={t("changeFile")} disabled={pending}>
          {t("summary", { valid: importable.length, skipped })}
        </FileHeader>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setStep({ kind: "columns", source, mapping, excluded })}
        >
          <Columns3 aria-hidden />
          {t("editColumns")}
        </Button>

        {parsed.classFromSheet && (
          <Notice tone="info" title={t("classFromSheet")}>
            {t("classFromSheetHint", {
              sheets: selectedSheets(source, excluded)
                .map((sheet) => sheet.name)
                .join(", "),
            })}
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
                  {rowLabel(parsed.lines, row.row)} <span className="font-medium">{row.label}</span> —{" "}
                  {row.issues.map((issue) => tIssues(issue)).join(", ")}
                </li>
              ))}
            </ul>
          </Notice>
        )}

        {duplicates.length > 0 && (
          <Notice tone="warning" title={t("duplicates", { count: duplicates.length })}>
            <p>{t("duplicatesHint")}</p>
            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
              {duplicates.map(({ row, existing: known }) => {
                const name = `${row.student.first_name} ${row.student.last_name}`;
                return (
                  <li key={row.row}>
                    <label className="flex items-start gap-3 rounded-lg bg-white/70 px-3 py-2 text-ink">
                      <Checkbox
                        className="mt-0.5"
                        checked={allowed.has(row.row)}
                        onCheckedChange={(checked) => toggleAllowed(row.row, checked === true)}
                        aria-label={t("importAnyway", { name })}
                      />
                      <span className="min-w-0">
                        <span className="font-medium">
                          {rowLabel(parsed.lines, row.row)} {name}
                        </span>{" "}
                        <span className="text-ink-soft">
                          {[row.student.birth_date ? formatDate(row.student.birth_date) : null, row.className]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span className="block text-xs text-ink-soft">
                          {known
                            ? t("alreadyEnrolled", {
                                details: [known.birthDate ? formatDate(known.birthDate) : null, known.className]
                                  .filter(Boolean)
                                  .join(" · "),
                              })
                            : t("twiceInFile")}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
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
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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

function FileHeader({
  fileName,
  label,
  onReset,
  disabled,
  children,
}: {
  fileName: string;
  label: string;
  onReset: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
      <span className="flex size-11 items-center justify-center rounded-xl bg-azure-50 text-azure-700">
        <FileSpreadsheet className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{fileName}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
      <Button variant="ghost" onClick={onReset} disabled={disabled}>
        {label}
      </Button>
    </section>
  );
}

function Notice({ tone, title, children }: { tone: "info" | "warning" | "danger"; title: string; children?: React.ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl p-4 text-sm",
        tone === "danger" && "bg-danger-50 text-danger-700",
        tone === "warning" && "bg-warning-50 text-warning-700",
        tone === "info" && "bg-azure-50 text-azure-700",
      )}
    >
      {tone === "info" ? (
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1">{children}</div>}
      </div>
    </div>
  );
}
