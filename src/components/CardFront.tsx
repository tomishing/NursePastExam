import { cardLabel, choiceNumbers, correctChoices, DECK_LABELS, FIGURE_MISSING_TEXT, SESSION_LABELS } from "../lib/card.ts";
import type { Card } from "../types/card.ts";
import CardImages from "./CardImages.tsx";
import Icon from "./Icon.tsx";

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
  const figureChoices = card.choices.length === 0;

  return (
    <article aria-label={label}>
      <div className="card p-4 sm:p-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">{DECK_LABELS[card.deck]}</span>
          <span className="palt">
            {card.exam} {SESSION_LABELS[card.session]} 問{card.q}
          </span>
          <span aria-hidden="true">·</span>
          <span>{card.category}</span>
        </p>

        <p className="mt-3 text-[1.0625rem] leading-8 whitespace-pre-line">{card.question}</p>

        {card.figureMissing && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn-ink">
            <Icon name="info" className="size-4 shrink-0" />
            {FIGURE_MISSING_TEXT}
          </p>
        )}

        <CardImages images={card.images} label={label} />
      </div>

      {card.answer.type === "value" || (numbers.length === 0 && card.answer.type !== "choice") ? (
        <p className="mt-3 inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-sm font-medium text-ink-2">計算問題</p>
      ) : (
        <ol className={`mt-3 ${figureChoices ? "grid grid-cols-[repeat(auto-fit,minmax(5rem,1fr))] gap-2" : "space-y-2"}`}>
          {numbers.map((n) => {
            const isSelected = selected.includes(n);
            const isCorrect = correct.has(n);
            const state = revealed ? (isCorrect ? "correct" : isSelected ? "wrong" : "idle") : isSelected ? "selected" : "idle";
            const tile = {
              idle: "border-line bg-surface",
              selected: "border-brand bg-surface-muted",
              correct: "border-good bg-good-soft",
              wrong: "border-bad bg-bad-soft",
            }[state];
            const badge = {
              idle: "bg-surface-muted text-ink-2",
              selected: "bg-brand-strong text-on-brand",
              correct: "bg-good text-on-good",
              wrong: "bg-bad text-on-bad",
            }[state];
            return (
              <li key={n}>
                <button
                  type="button"
                  disabled={!onSelect}
                  onClick={() => onSelect?.(n)}
                  aria-pressed={isSelected}
                  // An explicit name keeps "1. 選択肢" intact; the badge layout would otherwise split it.
                  aria-label={`${n}. ${figureChoices ? "" : (card.choices[n - 1] ?? "")}${revealed && isCorrect ? "（正解）" : ""}`.trim()}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors disabled:cursor-default ${
                    onSelect && !isSelected ? "hover:border-line-strong" : ""
                  } ${tile} ${figureChoices ? "justify-center" : ""}`}
                >
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${badge}`}>
                    {n}
                  </span>
                  {!figureChoices && <span className="min-w-0 flex-1 leading-relaxed">{card.choices[n - 1] ?? ""}</span>}
                  {revealed && isCorrect && (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold whitespace-nowrap text-good-ink">
                      <Icon name="check" className="size-4" />
                      正解
                    </span>
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
