// Display and grading helpers for cards (specification.md sections 2-3).
import type { Card, Deck, Session } from "../types/card.ts";

export const NOTICE =
  "解説は公式のものではありません。統計は出題当時の値で、法令は改正されている場合があります。";
export const FIGURE_MISSING_TEXT = "図は原本を参照してください";

export const DECK_LABELS: Record<Deck, string> = { nurse: "看護師", ph: "保健師" };
const SESSION_LABELS: Record<Session, string> = { AM: "午前", PM: "午後" };

/** e.g. "保健師 第98回 午後 問38" */
export function cardLabel(card: Card): string {
  return `${DECK_LABELS[card.deck]} ${card.exam} ${SESSION_LABELS[card.session]} 問${card.q}`;
}

export function imageUrl(name: string): string {
  return `${import.meta.env.BASE_URL}images/${encodeURIComponent(name)}`;
}

/** Numbers the user can pick: the listed choices, or the choices drawn in the figure. */
export function choiceNumbers(card: Card): number[] {
  const count = card.choices.length > 0 ? card.choices.length : (card.figureChoiceCount ?? 0);
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** Every choice that appears in some accepted answer. */
export function correctChoices(card: Card): Set<number> {
  return card.answer.type === "choice" ? new Set(card.answer.accepted.flat()) : new Set();
}

/** How many choices one answer needs: 1 normally, 2 for select-two questions. */
export function selectionSize(card: Card): number {
  return card.answer.type === "choice" ? Math.max(...card.answer.accepted.map((set) => set.length)) : 1;
}

/** Applies a tap on choice `n` to the current selection. */
export function toggleChoice(selected: number[], n: number, size: number): number[] {
  if (selected.includes(n)) return selected.filter((x) => x !== n);
  if (size <= 1) return [n];
  return selected.length < size ? [...selected, n].sort((a, b) => a - b) : selected;
}

/**
 * Grades the choices tapped before revealing. Undefined means "not graded":
 * nothing was selected, or the card is a calculation or has no official answer.
 * A selection is correct when it equals one accepted set exactly.
 */
export function grade(card: Card, selected: number[]): boolean | undefined {
  if (card.answer.type !== "choice" || selected.length === 0) return undefined;
  const picked = [...new Set(selected)].sort((a, b) => a - b).join(",");
  return card.answer.accepted.some((set) => [...set].sort((a, b) => a - b).join(",") === picked);
}
