import type { Rating } from "../types/progress.ts";

export const RATING_LABELS: Record<Rating, string> = { 1: "もう一度", 2: "難しい", 3: "正解", 4: "簡単" };

const TONES: Record<Rating, string> = {
  1: "border-rose-300 bg-rose-50 text-rose-900",
  2: "border-amber-300 bg-amber-50 text-amber-900",
  3: "border-emerald-300 bg-emerald-50 text-emerald-900",
  4: "border-sky-300 bg-sky-50 text-sky-900",
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
          className={`flex min-h-14 flex-col items-center justify-center rounded-lg border-2 px-1 py-2 disabled:opacity-50 ${TONES[rating]}`}
        >
          <span className="text-xs opacity-75">{intervals[rating]}</span>
          <span className="font-bold">{RATING_LABELS[rating]}</span>
          <span className="hidden text-xs opacity-60 sm:block">{rating}</span>
        </button>
      ))}
    </div>
  );
}
