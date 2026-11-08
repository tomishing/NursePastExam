import type { Card, Deck } from "../types/card.ts";

export type CardFilter = {
  deck: Deck | "all";
  category: string | "all";
  yearFrom: number | null;
  yearTo: number | null;
};

export const ALL_CARDS: CardFilter = { deck: "all", category: "all", yearFrom: null, yearTo: null };

export function filterCards(cards: Card[], filter: CardFilter): Card[] {
  return cards.filter(
    (card) =>
      (filter.deck === "all" || card.deck === filter.deck) &&
      (filter.category === "all" || card.category === filter.category) &&
      (filter.yearFrom === null || card.year >= filter.yearFrom) &&
      (filter.yearTo === null || card.year <= filter.yearTo),
  );
}

/** Categories and years available for the chosen deck, in note order and ascending order. */
export function filterOptions(cards: Card[], deck: CardFilter["deck"]): { categories: string[]; years: number[] } {
  const inDeck = deck === "all" ? cards : cards.filter((card) => card.deck === deck);
  return {
    categories: [...new Set(inDeck.map((card) => card.category))],
    years: [...new Set(inDeck.map((card) => card.year))].sort((a, b) => a - b),
  };
}
