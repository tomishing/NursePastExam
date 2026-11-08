import type { Progress, ReviewLog, Settings } from "../types/progress.ts";

/**
 * All progress access goes through this interface (CLAUDE.md rules), so a server-backed
 * implementation can replace IndexedDB later. Writes that belong together are atomic.
 */
export interface ProgressRepository {
  getAllProgress(): Promise<Progress[]>;
  getProgress(cardId: string): Promise<Progress | undefined>;
  saveProgress(progress: Progress): Promise<void>;

  /** Saves the new progress and appends the log entry in one transaction. */
  recordReview(progress: Progress, log: ReviewLog): Promise<void>;

  /**
   * Restores a card's progress (or removes it when `restored` is null, for a card that
   * was new) and appends the undo entry, in one transaction.
   */
  recordUndo(cardId: string, restored: Progress | null, undoEntry: ReviewLog): Promise<void>;

  /** Log entries reviewed at or after `since` (ISO 8601), oldest first. All entries if omitted. */
  getReviewLogs(since?: string): Promise<ReviewLog[]>;

  getSettings(): Promise<Settings>;
  saveSettings(changes: Partial<Settings>): Promise<Settings>;
}
