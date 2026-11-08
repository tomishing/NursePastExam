// Builds cards.json content from the notes, info.md and an index of image files.
// Pure: no file access, so it can be tested with fixtures.
import type { Card, CardsFile, Deck } from "../../src/types/card.ts";
import { parseRow } from "./card.ts";
import { parseSources, sourceUrl } from "./sources.ts";
import { categoryFromHeading, readQuestionTables } from "./table.ts";

export type NoteInput = { deck: Deck; file: string; text: string };

/** Image file name -> folders it was found in. */
export type ImageIndex = ReadonlyMap<string, readonly string[]>;

export type BuildResult = {
  file: Omit<CardsFile, "generatedAt">;
  usedImages: string[];
  errors: string[];
  warnings: string[];
};

export function buildCards(input: {
  notes: NoteInput[];
  info: { file: string; text: string };
  images: ImageIndex;
  figureChoiceCounts: Readonly<Record<string, number>>;
}): BuildResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cards: Card[] = [];
  const counts: Record<string, number> = {};
  const lineOf = new Map<string, string>(); // card id -> "file:line"
  const rowIds = new Set<string>(); // IDs of all rows, including rows with errors

  for (const note of input.notes) {
    const tables = readQuestionTables(note.text, note.file);
    errors.push(...tables.errors);
    counts[note.deck] ??= 0;

    for (const section of tables.sections) {
      if (section.expected === null) continue;
      const category = categoryFromHeading(section.heading);
      if (section.rows.length !== section.expected) {
        errors.push(
          `${note.file}:${section.line}: heading "${section.heading}" says ${section.expected} questions, but its table has ${section.rows.length} rows`,
        );
      }

      for (const row of section.rows) {
        const where = `${note.file}:${row.line}`;
        const parsed = parseRow(row.cells, { deck: note.deck, category, where }, input.figureChoiceCounts);
        errors.push(...parsed.errors);
        warnings.push(...parsed.warnings);
        if (parsed.id) rowIds.add(parsed.id);
        const card = parsed.card;
        if (!card) continue;

        const previous = lineOf.get(card.id);
        if (previous) {
          errors.push(`${where} (${card.id}): duplicate card ID, also produced by ${previous}`);
          continue;
        }
        lineOf.set(card.id, where);
        cards.push(card);
        counts[note.deck] = (counts[note.deck] ?? 0) + 1;
        const key = `${note.deck}/${category}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
  }

  // Overrides must point at real cards.
  for (const id of Object.keys(input.figureChoiceCounts)) {
    if (!rowIds.has(id)) errors.push(`scripts/lib/overrides.ts: figureChoiceCount is set for ${id}, but no row produces that ID`);
  }

  // Images: each named file must exist in exactly one folder.
  const used = new Set<string>();
  for (const card of cards) {
    for (const name of card.images) {
      const folders = input.images.get(name) ?? [];
      const where = `${lineOf.get(card.id)} (${card.id})`;
      if (folders.length === 0) errors.push(`${where}: image "${name}" not found in any image folder`);
      else if (folders.length > 1) errors.push(`${where}: image "${name}" is in more than one folder: ${folders.join(", ")}`);
      used.add(name);
    }
  }
  // Skipped when rows failed, because their images would be reported as unused.
  if (errors.length === 0) {
    for (const name of input.images.keys()) {
      if (!used.has(name)) warnings.push(`image "${name}" is not used by any row`);
    }
  }

  // Source URLs: every exam round in the cards needs one.
  const sources = parseSources(input.info.text, input.info.file);
  errors.push(...sources.errors);
  if (sources.errors.length === 0) {
    const missing = new Set<string>();
    for (const card of cards) {
      if (!sourceUrl(sources.sources, card.deck, card.exam)) missing.add(`${card.deck} ${card.exam}`);
    }
    for (const round of missing) errors.push(`${input.info.file}: no source URL for ${round}`);
  }

  return {
    file: { counts, sources: sources.sources, cards },
    usedImages: [...used].sort(),
    errors,
    warnings,
  };
}
