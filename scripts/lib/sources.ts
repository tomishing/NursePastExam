// Reads content/info.md: the MHLW page URL for each exam round (data_format.md, "Source URLs").
import type { Deck, SourceEntry } from "../../src/types/card.ts";
import { splitRow } from "./table.ts";

const COLUMNS = { year: "実施年", nurse: "看護師", ph: "保健師", page: "ページ" } as const;

export function parseSources(text: string, file: string): { sources: SourceEntry[]; errors: string[] } {
  const lines = text.split(/\r?\n/);
  const sources: SourceEntry[] = [];
  const errors: string[] = [];

  const headerIndex = lines.findIndex((line) => {
    const cells = line.trim().startsWith("|") ? splitRow(line) : [];
    return cells.includes(COLUMNS.year) && cells.includes(COLUMNS.page);
  });
  if (headerIndex < 0) return { sources, errors: [`${file}: no table with columns 実施年 and ページ`] };

  const header = splitRow(lines[headerIndex] ?? "");
  const col = (name: string) => header.indexOf(name);
  const missing = Object.values(COLUMNS).filter((name) => col(name) < 0);
  if (missing.length > 0) return { sources, errors: [`${file}:${headerIndex + 1}: missing columns: ${missing.join(", ")}`] };

  for (let i = headerIndex + 2; i < lines.length && (lines[i] ?? "").trim().startsWith("|"); i++) {
    const cells = splitRow(lines[i] ?? "");
    const where = `${file}:${i + 1}`;
    const year = cells[col(COLUMNS.year)] ?? "";
    const url = (cells[col(COLUMNS.page)] ?? "").match(/\]\((https?:\/\/[^)\s]+)\)/)?.[1];
    if (!/^\d{4}$/.test(year)) errors.push(`${where}: 実施年 "${year}" is not a 4-digit year`);
    if (!url) errors.push(`${where}: ページ has no Markdown link`);
    if (!/^\d{4}$/.test(year) || !url) continue;
    const rounds = (cell: string | undefined) =>
      (cell ?? "")
        .split(/[・、,]/)
        .map((s) => s.trim())
        .filter((s) => s !== "");
    sources.push({
      year: Number(year),
      nurse: rounds(cells[col(COLUMNS.nurse)]),
      ph: rounds(cells[col(COLUMNS.ph)]),
      url,
    });
  }
  return { sources, errors };
}

/** Looks up the source URL for a deck and exam round, e.g. ("nurse", "第103回追加"). */
export function sourceUrl(sources: SourceEntry[], deck: Deck, exam: string): string | undefined {
  return sources.find((entry) => entry[deck].includes(exam))?.url;
}
