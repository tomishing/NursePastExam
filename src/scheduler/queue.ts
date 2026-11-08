// Builds the review queue (specification.md section 4): learning cards, then due reviews,
// then new cards, within the daily limits. Pure, so it can be tested with a fixed clock.
import type { Card } from "../types/card.ts";
import type { Progress, ReviewLog, Settings } from "../types/progress.ts";
import { dayKey, dayStart, nextDayStart } from "./day.ts";

/** Learning cards due within this window are shown now rather than ending the session early. */
export const LEARN_AHEAD_MINUTES = 20;

export type Queue = {
  learning: Card[];
  review: Card[];
  new: Card[];
  /** Learning cards due later today, after the learn-ahead window. */
  laterToday: number;
};

export type TodayCounts = { newStudied: number; reviewsDone: number };

/** Rating entries that are still in effect (not reverted by an undo entry). */
export function effectiveRatings(logs: ReviewLog[]): ReviewLog[] {
  const undone = new Set(logs.flatMap((log) => (log.undoneId ? [log.undoneId] : [])));
  return logs.filter((log) => !log.undoneId && !undone.has(log.id));
}

/** New cards started and reviews done during the study day containing `now`. */
export function todayCounts(logs: ReviewLog[], now: Date): TodayCounts {
  const start = dayStart(now).getTime();
  const end = nextDayStart(now).getTime();
  let newStudied = 0;
  let reviewsDone = 0;
  for (const log of effectiveRatings(logs)) {
    const at = new Date(log.reviewedAt).getTime();
    if (at < start || at >= end) continue;
    const before = log.previous?.fsrs.state ?? 0;
    if (before === 0) newStudied++;
    else if (before === 2) reviewsDone++;
  }
  return { newStudied, reviewsDone };
}

/** Deterministic per-day shuffle key, so the random new-card order is stable across reloads. */
function shuffleKey(seed: string, id: string): number {
  let hash = 2166136261;
  for (const char of `${seed}:${id}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function orderNew(cards: Card[], order: Settings["newCardOrder"], now: Date): Card[] {
  const byExam = (a: Card, b: Card) => a.year - b.year || a.session.localeCompare(b.session) || a.q - b.q;
  if (order === "oldest") return [...cards].sort(byExam);
  if (order === "newest") return [...cards].sort((a, b) => byExam(b, a));
  const seed = dayKey(now);
  return [...cards].sort((a, b) => shuffleKey(seed, a.id) - shuffleKey(seed, b.id));
}

/**
 * @param cards     the cards in the user's current selection (deck and filters applied)
 * @param progress  progress records by card ID
 * @param logs      review log entries (at least those of the current study day)
 */
export function buildQueue(
  cards: Card[],
  progress: ReadonlyMap<string, Progress>,
  logs: ReviewLog[],
  settings: Settings,
  now: Date,
): Queue {
  const learnUntil = now.getTime() + LEARN_AHEAD_MINUTES * 60_000;
  const dayEnd = nextDayStart(now).getTime();
  const learning: { card: Card; due: number }[] = [];
  const review: { card: Card; due: number }[] = [];
  const fresh: Card[] = [];
  let laterToday = 0;

  for (const card of cards) {
    if (card.answer.type === "none" && !settings.includeNoAnswer) continue;
    const record = progress.get(card.id);
    if (record?.suspended) continue;
    const state = record?.fsrs.state ?? 0;
    if (state === 0) {
      fresh.push(card);
      continue;
    }
    const due = new Date(record!.fsrs.due).getTime();
    if (state === 1 || state === 3) {
      if (due <= learnUntil) learning.push({ card, due });
      else if (due < dayEnd) laterToday++;
    } else if (due < dayEnd) {
      review.push({ card, due });
    }
  }

  const today = todayCounts(logs, now);
  const reviewRoom = Math.max(0, settings.reviewsPerDay - today.reviewsDone);
  const newRoom = Math.max(0, settings.newPerDay - today.newStudied);
  const byDue = (a: { due: number }, b: { due: number }) => a.due - b.due;

  return {
    learning: learning.sort(byDue).map((x) => x.card),
    review: review.sort(byDue).slice(0, reviewRoom).map((x) => x.card),
    new: orderNew(fresh, settings.newCardOrder, now).slice(0, newRoom),
    laterToday,
  };
}

/** The next card to show, in queue order. */
export function nextCard(queue: Queue): Card | undefined {
  return queue.learning[0] ?? queue.review[0] ?? queue.new[0];
}
