import { grade, NOTICE } from "../lib/card.ts";
import type { Card } from "../types/card.ts";
import CardFront from "./CardFront.tsx";

type Props = {
  card: Card;
  selected: number[]; // choices tapped before revealing
};

export default function CardBack({ card, selected }: Props) {
  const result = grade(card, selected);
  const answer = card.answer;

  return (
    <div>
      <CardFront card={card} selected={selected} revealed />

      <section aria-label="正答" className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        {result !== undefined && (
          <p className={`mb-2 font-bold ${result ? "text-emerald-700" : "text-rose-700"}`}>
            あなたの解答：{result ? "正解" : "不正解"}
          </p>
        )}
        <h2 className="text-sm font-bold text-slate-500">正答</h2>
        <p className="mt-1 text-lg font-bold">{card.answerText}</p>
        {answer.type === "choice" && answer.accepted.length > 1 && (
          <p className="mt-1 text-sm text-emerald-700">いずれも正解</p>
        )}
        {answer.type === "none" && <p className="mt-1 text-sm text-slate-600">この問題は採点対象外です。</p>}
      </section>

      {card.explanation && (
        <section aria-label="解説" className="mt-4">
          <h2 className="text-sm font-bold text-slate-500">解説</h2>
          <p className="mt-1 whitespace-pre-line leading-relaxed">{card.explanation}</p>
        </section>
      )}

      <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">{NOTICE}</p>
    </div>
  );
}
