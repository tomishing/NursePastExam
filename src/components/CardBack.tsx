import { grade, NOTICE } from "../lib/card.ts";
import type { Card } from "../types/card.ts";
import CardFront from "./CardFront.tsx";
import Icon from "./Icon.tsx";

type Props = {
  card: Card;
  selected: number[]; // choices tapped before revealing
  showResult?: boolean; // Review shows the result beside the rating buttons instead
};

export default function CardBack({ card, selected, showResult = true }: Props) {
  const result = showResult ? grade(card, selected) : undefined;
  const answer = card.answer;

  return (
    <div>
      <CardFront card={card} selected={selected} revealed />

      <section aria-label="正答" className="mt-4 rounded-2xl border border-brand/30 bg-brand-soft p-4">
        {result !== undefined && (
          <p
            className={`mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold ${
              result
                ? "bg-good text-on-good"
                : "bg-bad text-on-bad"
            }`}
          >
            <Icon name={result ? "check" : "x"} className="size-4" />
            あなたの解答：{result ? "正解" : "不正解"}
          </p>
        )}
        <h2 className="eyebrow text-brand-ink">正答</h2>
        <p className="mt-1 text-lg font-bold">{card.answerText}</p>
        {answer.type === "choice" && answer.accepted.length > 1 && <p className="mt-1 text-sm text-brand-ink">いずれも正解</p>}
        {answer.type === "none" && <p className="mt-1 text-sm text-ink-2">この問題は採点対象外です。</p>}
      </section>

      {card.explanation && (
        <section aria-label="解説" className="card mt-4 p-4 sm:p-5">
          <h2 className="eyebrow">解説</h2>
          <p className="mt-2 leading-8 whitespace-pre-line">{card.explanation}</p>
        </section>
      )}

      <p className="mt-4 flex gap-2 px-1 text-sm leading-relaxed text-ink-3">
        <Icon name="info" className="mt-0.5 size-4 shrink-0" />
        <span>{NOTICE}</span>
      </p>
    </div>
  );
}
