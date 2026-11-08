// Rating, undo and suspend. Combines the scheduler with a ProgressRepository and a clock,
// so tests can use a fixed time and an in-memory store.
import { uuid } from "../lib/uuid.ts";
import type { ProgressRepository } from "../repositories/ProgressRepository.ts";
import type { Card } from "../types/card.ts";
import type { Progress, Rating, ReviewLog } from "../types/progress.ts";
import { dayStart } from "./day.ts";
import { newFsrsState, schedule } from "./fsrs.ts";
import { effectiveRatings } from "./queue.ts";

export type Clock = () => Date;
export const systemClock: Clock = () => new Date();

export class ReviewService {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  /** Records a rating. `correct` is the result of the tapped choices, if graded; it never changes the rating. */
  async rate(card: Card, rating: Rating, answer: { selected?: number[]; correct?: boolean } = {}): Promise<Progress> {
    const now = this.clock();
    const settings = await this.repo.getSettings();
    const previous = (await this.repo.getProgress(card.id)) ?? null;
    const progress: Progress = {
      cardId: card.id,
      fsrs: schedule(previous?.fsrs, rating, now, settings.desiredRetention),
      suspended: previous?.suspended ?? false,
      lastContentHash: card.contentHash,
      updatedAt: now.toISOString(),
    };
    const log: ReviewLog = {
      id: uuid(),
      cardId: card.id,
      rating,
      reviewedAt: now.toISOString(),
      previous,
      ...(answer.selected && answer.selected.length > 0 ? { selected: answer.selected } : {}),
      ...(answer.correct !== undefined ? { correct: answer.correct } : {}),
    };
    await this.repo.recordReview(progress, log);
    return progress;
  }

  /**
   * Reverts the most recent rating still in effect today and returns its card ID,
   * or undefined if there is nothing to undo.
   */
  async undoLast(): Promise<string | undefined> {
    const now = this.clock();
    const logs = await this.repo.getReviewLogs(dayStart(now).toISOString());
    const last = effectiveRatings(logs).at(-1);
    if (!last) return undefined;
    const current = (await this.repo.getProgress(last.cardId)) ?? null;
    const restored = last.previous ? { ...last.previous, updatedAt: now.toISOString() } : null;
    const undoEntry: ReviewLog = {
      id: uuid(),
      undoneId: last.id,
      cardId: last.cardId,
      rating: last.rating,
      reviewedAt: now.toISOString(),
      previous: current,
    };
    await this.repo.recordUndo(last.cardId, restored, undoEntry);
    return last.cardId;
  }

  /** Suspends or restores a card. A card never reviewed gets a new-card record so the flag is kept. */
  async setSuspended(card: Card, suspended: boolean): Promise<void> {
    const now = this.clock();
    const existing = await this.repo.getProgress(card.id);
    await this.repo.saveProgress({
      cardId: card.id,
      fsrs: existing?.fsrs ?? newFsrsState(now),
      suspended,
      lastContentHash: existing?.lastContentHash ?? card.contentHash,
      updatedAt: now.toISOString(),
    });
  }
}
