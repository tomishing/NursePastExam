import type { Card } from "../types/card.ts";

/** Normalises full-width/half-width forms and case, so "ＷＨＯ" matches "who". */
function normalise(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

/** True when every space-separated term appears in the card's ID, question, choices, answer or explanation. */
export function matchesSearch(card: Card, query: string): boolean {
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalise([card.id, card.question, ...card.choices, card.answerText, card.explanation].join("\n"));
  return terms.every((term) => haystack.includes(term));
}
