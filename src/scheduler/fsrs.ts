// Thin wrapper around ts-fsrs: default parameters, desired retention from settings.
import { createEmptyCard, fsrs, generatorParameters, type Card as FsrsCard, type Grade } from "ts-fsrs";
import type { FsrsState, Rating } from "../types/progress.ts";

const RATINGS: readonly Rating[] = [1, 2, 3, 4];

function scheduler(desiredRetention: number) {
  return fsrs(generatorParameters({ request_retention: desiredRetention }));
}

function toFsrsCard(state: FsrsState): FsrsCard {
  return {
    ...state,
    due: new Date(state.due),
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  };
}

function fromFsrsCard(card: FsrsCard): FsrsState {
  const state: FsrsState = {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as FsrsState["state"],
  };
  if (card.last_review) state.last_review = card.last_review.toISOString();
  return state;
}

/** State of a card that has never been reviewed. */
export function newFsrsState(now: Date): FsrsState {
  return fromFsrsCard(createEmptyCard(now));
}

/** The card's state after rating it at `now`. `state` is undefined for a card never seen. */
export function schedule(state: FsrsState | undefined, rating: Rating, now: Date, desiredRetention: number): FsrsState {
  const card = state ? toFsrsCard(state) : createEmptyCard(now);
  return fromFsrsCard(scheduler(desiredRetention).next(card, now, rating as Grade).card);
}

/** When the card would next be due for each rating, for the labels on the rating buttons. */
export function previewDue(state: FsrsState | undefined, now: Date, desiredRetention: number): Record<Rating, Date> {
  const card = state ? toFsrsCard(state) : createEmptyCard(now);
  const preview = scheduler(desiredRetention).repeat(card, now);
  return Object.fromEntries(RATINGS.map((r) => [r, preview[r as Grade].card.due])) as Record<Rating, Date>;
}

/** Short Japanese interval label, e.g. "1分", "10分", "3日", "2か月", "1.5年". */
export function formatInterval(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)}分`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}時間`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}日`;
  if (days < 365) return `${Math.round(days / 30)}か月`;
  const years = days / 365;
  return `${years < 10 ? Math.round(years * 10) / 10 : Math.round(years)}年`;
}
