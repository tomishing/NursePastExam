// Turns one table row into a Card (data_format.md sections 1-3).
import { createHash } from "node:crypto";
import type { Answer, Card, Deck, Session } from "../../src/types/card.ts";
import type { QuestionColumn } from "./table.ts";

export const NO_OFFICIAL_ANSWER = "正答値表に記載なし";
const BR = /<br\s*\/?>/i;
const SESSIONS: Record<string, Session> = { AM: "AM", PM: "PM", 午前: "AM", 午後: "PM" };

export type RowContext = {
  deck: Deck;
  category: string;
  where: string; // "file:line", used in messages
};

export type ParsedRow = {
  id: string | null; // known once Exam, Session and Q# parse, even if the row has other errors
  card: Card | null;
  errors: string[];
  warnings: string[];
};

export function cardId(deck: Deck, examNumber: number, additional: boolean, session: Session, q: number): string {
  return `${deck}-${examNumber}${additional ? "add" : ""}-${session}-${q}`;
}

export function contentHash(question: string, choices: string[], answerText: string, explanation: string): string {
  return createHash("sha256")
    .update(JSON.stringify([question, choices, answerText, explanation]))
    .digest("hex")
    .slice(0, 16);
}

/** Splits a `<br>`-separated cell into its non-empty, trimmed parts. */
export function splitBr(cell: string): string[] {
  return cell
    .split(new RegExp(BR, "gi"))
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

type ChoicesResult =
  | { kind: "numbered"; choices: string[] }
  | { kind: "calculation" }
  | { kind: "figure" }
  | { kind: "error"; message: string };

export function parseChoices(cell: string): ChoicesResult {
  const value = cell.trim();
  if (value === "" || value === "図の選択肢") return { kind: "figure" };
  if (/^[（(]計算問題[）)]$/.test(value)) return { kind: "calculation" };

  const choices: string[] = [];
  for (const [j, part] of splitBr(value).entries()) {
    const match = part.match(/^(\d+)\.\s*(.*)$/);
    if (!match || Number(match[1]) !== j + 1) {
      return { kind: "error", message: `choice ${j + 1} should start with "${j + 1}. " but is "${part}"` };
    }
    if (!match[2]) return { kind: "error", message: `choice ${j + 1} is empty` };
    choices.push(match[2]);
  }
  return { kind: "numbered", choices };
}

/**
 * Parses the Answer cell for a question with numbered choices (or choices in a figure).
 * Text after "：" is display text only. `・` joins choices that are all required,
 * and `または` separates alternatives that are each accepted.
 */
export function parseChoiceAnswer(answerText: string, choiceCount: number): Answer | string {
  const numbersPart = (answerText.split("：")[0] ?? "").trim();
  const accepted: number[][] = [];
  for (const alternative of numbersPart.split(/\s*または\s*/)) {
    const parts = alternative.split(/\s*・\s*/);
    if (!parts.every((part) => /^\d+$/.test(part))) {
      return `cannot parse answer "${answerText}" (expected e.g. "2：…", "1・4：…" or "3 または 4")`;
    }
    const numbers = parts.map(Number);
    const outOfRange = numbers.filter((n) => n < 1 || n > choiceCount);
    if (outOfRange.length > 0) {
      return `answer "${answerText}" refers to choice ${outOfRange.join(", ")}, but there are ${choiceCount} choices`;
    }
    if (new Set(numbers).size !== numbers.length) return `answer "${answerText}" repeats a choice`;
    accepted.push(numbers);
  }
  return { type: "choice", accepted };
}

/** Converts the only allowed markup (`<br>`) to newlines. Everything else, including `<UNICEF>`, stays literal. */
function plainText(cell: string): string {
  return cell.replace(new RegExp(BR, "gi"), "\n").trim();
}

export function parseRow(
  cells: Record<QuestionColumn, string>,
  ctx: RowContext,
  figureChoiceCounts: Readonly<Record<string, number>>,
): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const year = cells.Year;
  if (!/^\d{4}$/.test(year)) errors.push(`Year "${year}" is not a 4-digit number`);

  const exam = cells.Exam;
  const examMatch = exam.match(/^第(\d+)回(追加)?$/);
  if (!examMatch) errors.push(`Exam "${exam}" should look like 第98回 or 第103回追加`);

  const session = SESSIONS[cells.Session];
  if (!session) errors.push(`Session "${cells.Session}" should be AM, PM, 午前 or 午後`);

  const qText = cells["Q#"];
  if (!/^\d+$/.test(qText)) errors.push(`Q# "${qText}" is not a number`);

  if (errors.length > 0 || !examMatch || !session) {
    return { id: null, card: null, errors: errors.map((message) => `${ctx.where}: ${message}`), warnings };
  }

  const q = Number(qText);
  const id = cardId(ctx.deck, Number(examMatch[1]), Boolean(examMatch[2]), session, q);
  const label = `${ctx.where} (${id})`;
  const withLabel = (list: string[]) => list.map((message) => `${label}: ${message}`);

  const question = plainText(cells.Question);
  const answerText = cells.Answer.trim();
  const explanation = plainText(cells.Explanation);
  if (question === "") errors.push("Question is empty");
  if (answerText === "") errors.push("Answer is empty");
  if (explanation === "") warnings.push("Explanation is empty");

  const choicesResult = parseChoices(cells.Choices);
  const override = figureChoiceCounts[id];
  let choices: string[] = [];
  let figureChoiceCount: number | undefined;
  let answer: Answer | undefined;

  if (choicesResult.kind === "error") {
    errors.push(choicesResult.message);
  } else if (override !== undefined && choicesResult.kind !== "figure") {
    errors.push(
      `has a figureChoiceCount override, so Choices should be 図の選択肢 or empty, but is "${cells.Choices}"`,
    );
  } else if (answerText === NO_OFFICIAL_ANSWER) {
    answer = { type: "none" };
  } else if (choicesResult.kind === "calculation") {
    answer = { type: "value", value: answerText };
  }

  if (choicesResult.kind === "numbered") choices = choicesResult.choices;
  if (choicesResult.kind === "figure") {
    if (override === undefined) {
      errors.push("choices are in the figure (図の選択肢), but scripts/lib/overrides.ts has no figureChoiceCount for it");
    } else {
      figureChoiceCount = override;
    }
  }

  const choiceCount = choicesResult.kind === "figure" ? figureChoiceCount : choices.length;
  if (!answer && answerText !== "" && choiceCount !== undefined && errors.length === 0) {
    const parsed = parseChoiceAnswer(answerText, choiceCount);
    if (typeof parsed === "string") errors.push(parsed);
    else answer = parsed;
  }

  if (errors.length > 0 || !answer) {
    if (errors.length === 0) errors.push(`cannot parse answer "${answerText}"`);
    return { id, card: null, errors: withLabel(errors), warnings: withLabel(warnings) };
  }

  const images = splitBr(cells.Image);
  const card: Card = {
    id,
    deck: ctx.deck,
    category: ctx.category,
    year: Number(year),
    exam,
    session,
    q,
    question,
    choices,
    answerText,
    answer,
    explanation,
    images,
    ...(figureChoiceCount !== undefined ? { figureChoiceCount } : {}),
    figureMissing: images.length === 0 && /図は原本|別冊/.test(question + explanation),
    contentHash: contentHash(question, choices, answerText, explanation),
  };
  return { id, card, errors: [], warnings: withLabel(warnings) };
}
