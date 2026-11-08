// Statistics for the Stats page (specification.md section 5). Pure, so they can be tested.
import { dayKey, dayStart } from "../scheduler/day.ts";
import { effectiveRatings } from "../scheduler/queue.ts";
import type { Card, Deck } from "../types/card.ts";
import type { Progress, ReviewLog } from "../types/progress.ts";

export type CardStatus = "new" | "learning" | "review" | "suspended";

export function cardStatus(progress: Progress | undefined): CardStatus {
  if (progress?.suspended) return "suspended";
  const state = progress?.fsrs.state ?? 0;
  if (state === 0) return "new";
  return state === 2 ? "review" : "learning";
}

export const STATUS_LABELS: Record<CardStatus, string> = {
  new: "新規",
  learning: "学習中",
  review: "復習",
  suspended: "保留中",
};

/** Ratings per study day for the last `days` days, oldest first (days with none included). */
export function reviewsPerDay(logs: ReviewLog[], now: Date, days: number): { day: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const log of effectiveRatings(logs)) {
    const key = dayKey(new Date(log.reviewedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const result: { day: string; count: number }[] = [];
  const cursor = dayStart(now);
  cursor.setHours(12); // safely inside the study day for dayKey
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = dayKey(cursor);
    result.push({ day: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * Retention: the share of reviews of cards already in the Review state that were not
 * rated もう一度, over the last `days` days. Null when there were no such reviews.
 */
export function retention(logs: ReviewLog[], now: Date, days: number): { rate: number | null; reviews: number } {
  const since = dayStart(now);
  since.setDate(since.getDate() - (days - 1));
  const reviews = effectiveRatings(logs).filter(
    (log) => log.previous?.fsrs.state === 2 && new Date(log.reviewedAt) >= since,
  );
  const passed = reviews.filter((log) => log.rating > 1).length;
  return { rate: reviews.length > 0 ? passed / reviews.length : null, reviews: reviews.length };
}

/** Share of graded answers (choices tapped before revealing) that were correct. */
export function answerAccuracy(logs: ReviewLog[]): { rate: number | null; graded: number } {
  const graded = effectiveRatings(logs).filter((log) => log.correct !== undefined);
  return { rate: graded.length > 0 ? graded.filter((log) => log.correct).length / graded.length : null, graded: graded.length };
}

/** `studied` counts cards reviewed at least once, whether or not they are now suspended. */
export type GroupProgress = { deck: Deck; category: string; total: number; studied: number } & Record<CardStatus, number>;

/** Card counts by status for each deck and category, in note order. */
export function progressByCategory(cards: Card[], progress: ReadonlyMap<string, Progress>): GroupProgress[] {
  const groups = new Map<string, GroupProgress>();
  for (const card of cards) {
    const key = `${card.deck}/${card.category}`;
    let group = groups.get(key);
    if (!group) {
      group = { deck: card.deck, category: card.category, total: 0, studied: 0, new: 0, learning: 0, review: 0, suspended: 0 };
      groups.set(key, group);
    }
    const record = progress.get(card.id);
    group.total++;
    if ((record?.fsrs.state ?? 0) !== 0) group.studied++;
    group[cardStatus(record)]++;
  }
  return [...groups.values()];
}
