import { DECK_LABELS } from "../lib/card.ts";
import { filterOptions, type CardFilter } from "../lib/filter.ts";
import type { Card, Deck } from "../types/card.ts";

type Props = {
  cards: Card[];
  value: CardFilter;
  onChange: (filter: CardFilter) => void;
};

export default function DeckFilter({ cards, value, onChange }: Props) {
  const { categories, years } = filterOptions(cards, value.deck);
  const toNumber = (v: string) => (v === "" ? null : Number(v));
  const decks = ["all", ...(Object.keys(DECK_LABELS) as Deck[])] as const;

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">絞り込み</legend>
      <label className="block">
        <span className="field-label">試験</span>
        {/* A native select keeps the accessible name and works everywhere; it is styled as a field. */}
        <select
          className="field"
          value={value.deck}
          onChange={(e) => onChange({ ...value, deck: e.target.value as Deck | "all", category: "all" })}
        >
          {decks.map((deck) => (
            <option key={deck} value={deck}>
              {deck === "all" ? "すべて" : DECK_LABELS[deck]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">分野</span>
        <select className="field" value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
          <option value="all">すべて</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">年（から）</span>
          <select className="field" value={value.yearFrom ?? ""} onChange={(e) => onChange({ ...value, yearFrom: toNumber(e.target.value) })}>
            <option value="">指定なし</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">年（まで）</span>
          <select className="field" value={value.yearTo ?? ""} onChange={(e) => onChange({ ...value, yearTo: toNumber(e.target.value) })}>
            <option value="">指定なし</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  );
}
