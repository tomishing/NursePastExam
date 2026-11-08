import { DECK_LABELS } from "../lib/card.ts";
import { filterOptions, type CardFilter } from "../lib/filter.ts";
import type { Card, Deck } from "../types/card.ts";

type Props = {
  cards: Card[];
  value: CardFilter;
  onChange: (filter: CardFilter) => void;
};

const selectClass = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2";

export default function DeckFilter({ cards, value, onChange }: Props) {
  const { categories, years } = filterOptions(cards, value.deck);
  const toNumber = (v: string) => (v === "" ? null : Number(v));

  return (
    <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <legend className="sr-only">絞り込み</legend>
      <label className="text-sm text-slate-600">
        試験
        <select
          className={selectClass}
          value={value.deck}
          onChange={(e) => onChange({ ...value, deck: e.target.value as Deck | "all", category: "all" })}
        >
          <option value="all">すべて</option>
          {(Object.keys(DECK_LABELS) as Deck[]).map((deck) => (
            <option key={deck} value={deck}>
              {DECK_LABELS[deck]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-600">
        分野
        <select className={selectClass} value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
          <option value="all">すべて</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-600">
        年（から）
        <select
          className={selectClass}
          value={value.yearFrom ?? ""}
          onChange={(e) => onChange({ ...value, yearFrom: toNumber(e.target.value) })}
        >
          <option value="">指定なし</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-600">
        年（まで）
        <select
          className={selectClass}
          value={value.yearTo ?? ""}
          onChange={(e) => onChange({ ...value, yearTo: toNumber(e.target.value) })}
        >
          <option value="">指定なし</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}
