import type { Rating } from "../types/progress.ts";

export const RATING_LABELS: Record<Rating, string> = { 1: "もう一度", 2: "難しい", 3: "正解", 4: "簡単" };

const TONES: Record<Rating, string> = {
  1: "bg-bad-soft text-bad-ink ring-bad-line hover:brightness-[0.97]",
  2: "bg-warn-soft text-warn-ink ring-warn-line hover:brightness-[0.97]",
  3: "bg-good-soft text-good-ink ring-good-line hover:brightness-[0.97]",
  4: "bg-info-soft text-info-ink ring-info-line hover:brightness-[0.97]",
};

type Props = {
  intervals: Record<Rating, string>; // next interval for each rating, e.g. "10分"
  onRate: (rating: Rating) => void;
  disabled?: boolean;
};

export default function RatingButtons({ intervals, onRate, disabled = false }: Props) {
  return (
    <div role="group" aria-label="評価" className="grid grid-cols-4 gap-2">
      {([1, 2, 3, 4] as const).map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onRate(rating)}
          aria-label={`${RATING_LABELS[rating]}（次回 ${intervals[rating]}、キー ${rating}）`}
          className={`flex min-h-15 flex-col items-center justify-center rounded-xl px-1 py-2 ring-1 transition-colors ring-inset disabled:opacity-50 ${TONES[rating]}`}
        >
          <span className="palt text-[15px] font-bold">{RATING_LABELS[rating]}</span>
          <span className="text-xs tabular-nums opacity-80">{intervals[rating]}</span>
          <span className="hidden text-[10px] opacity-60 sm:block">{rating}</span>
        </button>
      ))}
    </div>
  );
}
