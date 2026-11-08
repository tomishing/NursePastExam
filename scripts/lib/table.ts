// Markdown table reading for the source notes (data_format.md section 1).

export const QUESTION_COLUMNS = [
  "Year",
  "Exam",
  "Session",
  "Q#",
  "Question",
  "Choices",
  "Answer",
  "Explanation",
  "Image",
] as const;

export type QuestionColumn = (typeof QUESTION_COLUMNS)[number];

export type TableRow = {
  line: number; // 1-based line number in the note
  cells: Record<QuestionColumn, string>;
};

export type Section = {
  heading: string; // full heading text, e.g. "疫学 (180問)"
  line: number;
  expected: number | null; // N from "(N問)"
  rows: TableRow[];
};

/** Splits a table line into trimmed cells, allowing any whitespace around the pipes. */
export function splitRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);
  return body.split("|").map((cell) => cell.trim());
}

function isSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

const COUNT_SUFFIX = /\s*\((\d+)問\)\s*$/;

/** Category name from a heading: drops the "(N問)" count and any note in brackets. */
export function categoryFromHeading(heading: string): string {
  return heading
    .replace(COUNT_SUFFIX, "")
    .replace(/（[^）]*）|\([^)]*\)/g, "")
    .trim();
}

/**
 * Finds every question table (header starting with `| Year |`) and the level-2 heading it sits under.
 * Other tables, such as the keyword tables in the definitions section, are ignored.
 */
export function readQuestionTables(text: string, file: string): { sections: Section[]; errors: string[] } {
  const lines = text.split(/\r?\n/);
  const sections: Section[] = [];
  const errors: string[] = [];
  let current: Section | null = null;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading?.[1]) {
      const count = heading[1].match(COUNT_SUFFIX);
      current = { heading: heading[1], line: i + 1, expected: count?.[1] ? Number(count[1]) : null, rows: [] };
      sections.push(current);
      i++;
      continue;
    }

    const cells = line.trim().startsWith("|") ? splitRow(line) : null;
    if (!cells || cells[0] !== "Year") {
      i++;
      continue;
    }

    // A question table starts here.
    const headerLine = i + 1;
    const header = cells;
    const missing = QUESTION_COLUMNS.filter((col) => !header.includes(col));
    const where = `${file}:${headerLine}`;
    if (!current || current.expected === null) {
      errors.push(`${where}: question table is not under a "## <category> (N問)" heading`);
    }
    if (missing.length > 0) errors.push(`${where}: table header is missing columns: ${missing.join(", ")}`);
    if (!isSeparator(splitRow(lines[i + 1] ?? ""))) errors.push(`${where}: table header is not followed by a separator row`);

    i += 2;
    while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
      const rowCells = splitRow(lines[i] ?? "");
      if (rowCells.length !== header.length) {
        errors.push(`${file}:${i + 1}: row has ${rowCells.length} cells, expected ${header.length}`);
      } else if (missing.length === 0 && current) {
        const record = Object.fromEntries(header.map((name, j) => [name, rowCells[j] ?? ""]));
        current.rows.push({ line: i + 1, cells: record as Record<QuestionColumn, string> });
      }
      i++;
    }
  }

  return { sections, errors };
}
