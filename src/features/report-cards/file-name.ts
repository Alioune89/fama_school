/** Nom de fichier sans accents ni espaces : « bulletin-sow-mariama-1er-semestre.pdf ». */
export function pdfFileName(...parts: string[]) {
  const slug = parts
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "bulletin"}.pdf`;
}
