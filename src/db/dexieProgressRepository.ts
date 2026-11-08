import type { ProgressRepository } from "../repositories/ProgressRepository.ts";
import { DEFAULT_SETTINGS, type Progress, type ReviewLog, type Settings } from "../types/progress.ts";
import { NursePastExamDB } from "./database.ts";

export class DexieProgressRepository implements ProgressRepository {
  constructor(private readonly db: NursePastExamDB = new NursePastExamDB()) {}

  // Methods are async so that storage errors (e.g. no IndexedDB) always reject rather than throw.
  async getAllProgress(): Promise<Progress[]> {
    return this.db.progress.toArray();
  }

  async getProgress(cardId: string): Promise<Progress | undefined> {
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

  async getReviewLogs(since?: string): Promise<ReviewLog[]> {
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

  async replaceAll(data: { progress: Progress[]; reviewLog: ReviewLog[]; settings: Settings }): Promise<void> {
    await this.db.transaction("rw", this.db.progress, this.db.reviewLog, this.db.settings, async () => {
      await Promise.all([this.db.progress.clear(), this.db.reviewLog.clear(), this.db.settings.clear()]);
      await this.db.progress.bulkAdd(data.progress);
      await this.db.reviewLog.bulkAdd(data.reviewLog);
      await this.db.settings.bulkPut(Object.entries(data.settings).map(([key, value]) => ({ key, value })));
    });
  }
}
