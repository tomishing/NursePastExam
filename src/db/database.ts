import Dexie, { type EntityTable } from "dexie";
import type { Progress, ReviewLog } from "../types/progress.ts";

export type SettingRow = { key: string; value: unknown };

export class NursePastExamDB extends Dexie {
  progress!: EntityTable<Progress, "cardId">;
  reviewLog!: EntityTable<ReviewLog, "id">;
  settings!: EntityTable<SettingRow, "key">;

  constructor(name = "NursePastExam") {
    super(name);
    this.version(1).stores({
      progress: "cardId, updatedAt",
      reviewLog: "id, cardId, reviewedAt",
      settings: "key",
    });
  }
}
