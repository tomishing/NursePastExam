import type { ProgressRepository } from "../repositories/ProgressRepository.ts";
import { DEFAULT_SETTINGS, type Progress, type ReviewLog, type Settings } from "../types/progress.ts";
import { NursePastExamDB } from "./database.ts";

export class DexieProgressRepository implements ProgressRepository {
  constructor(private readonly db: NursePastExamDB = new NursePastExamDB()) {}

  getAllProgress(): Promise<Progress[]> {
    return this.db.progress.toArray();
  }

  getProgress(cardId: string): Promise<Progress | undefined> {
    return this.db.progress.get(cardId);
  }

  async saveProgress(progress: Progress): Promise<void> {
    await this.db.progress.put(progress);
  }

  async recordReview(progress: Progress, log: ReviewLog): Promise<void> {
    await this.db.transaction("rw", this.db.progress, this.db.reviewLog, async () => {
      await this.db.progress.put(progress);
      await this.db.reviewLog.add(log);
    });
  }

  async recordUndo(cardId: string, restored: Progress | null, undoEntry: ReviewLog): Promise<void> {
    await this.db.transaction("rw", this.db.progress, this.db.reviewLog, async () => {
      if (restored) await this.db.progress.put(restored);
      else await this.db.progress.delete(cardId);
      await this.db.reviewLog.add(undoEntry);
    });
  }

  getReviewLogs(since?: string): Promise<ReviewLog[]> {
    const query = since ? this.db.reviewLog.where("reviewedAt").aboveOrEqual(since) : this.db.reviewLog.orderBy("reviewedAt");
    return query.sortBy("reviewedAt");
  }

  async getSettings(): Promise<Settings> {
    const rows = await this.db.settings.toArray();
    const stored = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async saveSettings(changes: Partial<Settings>): Promise<Settings> {
    await this.db.settings.bulkPut(Object.entries(changes).map(([key, value]) => ({ key, value })));
    return this.getSettings();
  }
}
