import { cardLabel, choiceNumbers, correctChoices, FIGURE_MISSING_TEXT } from "../lib/card.ts";
import type { Card } from "../types/card.ts";
import CardImages from "./CardImages.tsx";

type Props = {
  card: Card;
  selected: number[];
  onSelect?: (n: number) => void; // omitted once the answer is shown
  revealed?: boolean; // set by CardBack to highlight the correct choices
};

// Exam text is always rendered as plain React text, never as HTML (CLAUDE.md rules).
export default function CardFront({ card, selected, onSelect, revealed = false }: Props) {
  const label = cardLabel(card);
  const correct = revealed ? correctChoices(card) : new Set<number>();
  const numbers = choiceNumbers(card);

  return (
    <article aria-label={label}>
      <p className="text-sm text-slate-500">
        {label}
        <span className="ml-2">{card.category}</span>
      </p>

      <p className="mt-2 whitespace-pre-line leading-relaxed">{card.question}</p>

      {card.figureMissing && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">{FIGURE_MISSING_TEXT}</p>
      )}

      <CardImages images={card.images} label={label} />

      {card.answer.type === "value" || (numbers.length === 0 && card.answer.type !== "choice") ? (
        <p className="mt-4 inline-block rounded bg-slate-200 px-2 py-1 text-sm">計算問題</p>
      ) : (
        <ol
          className={`mt-4 ${card.choices.length > 0 ? "space-y-2" : "grid grid-cols-[repeat(auto-fit,minmax(5rem,1fr))] gap-2"}`}
        >
          {numbers.map((n) => {
            const isSelected = selected.includes(n);
            const isCorrect = correct.has(n);
            const tone = revealed
              ? isCorrect
                ? "border-emerald-600 bg-emerald-50"
                : isSelected
                  ? "border-rose-500 bg-rose-50"
                  : "border-slate-200 bg-white"
              : isSelected
                ? "border-teal-600 bg-teal-50"
                : "border-slate-200 bg-white";
            return (
              <li key={n}>
                <button
                  type="button"
                  disabled={!onSelect}
                  onClick={() => onSelect?.(n)}
                  aria-pressed={isSelected}
                  className={`flex min-h-11 w-full items-start gap-2 rounded-lg border-2 px-3 py-2 text-left disabled:cursor-default ${tone}`}
                >
                  <span className="font-bold">{n}.</span>
                  <span className="flex-1">{card.choices[n - 1] ?? ""}</span>
                  {revealed && isCorrect && (
                    <span className="shrink-0 whitespace-nowrap text-sm font-bold text-emerald-700">正解</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
