// Progress, review log and settings types (data_format.md section 6).

export type Rating = 1 | 2 | 3 | 4; // もう一度 / 難しい / 正解 / 簡単

/** 0 New, 1 Learning, 2 Review, 3 Relearning (ts-fsrs State). */
export type FsrsStateValue = 0 | 1 | 2 | 3;

/** ts-fsrs card state, stored with ISO 8601 dates so it survives JSON export. */
export type FsrsState = {
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: FsrsStateValue;
  last_review?: string;
};

export type Progress = {
  cardId: string;
  fsrs: FsrsState;
  suspended: boolean;
  lastContentHash: string;
  updatedAt: string; // ISO 8601, for later sync
};

/**
 * Append-only. A rating adds an entry with `previous` set to the card's progress before
 * the rating (null for a card never seen). Undo adds a new entry whose `undoneId` points
 * at the rating it reverts; that entry copies the rating and stores the progress it replaced.
 */
export type ReviewLog = {
  id: string; // UUID, so devices can merge logs later
  undoneId?: string;
  cardId: string;
  rating: Rating;
  selected?: number[]; // choices tapped before revealing
  correct?: boolean; // absent if not graded
  reviewedAt: string; // ISO 8601
  previous: Progress | null;
};

export type NewCardOrder = "random" | "oldest" | "newest";

export type Settings = {
  newPerDay: number;
  reviewsPerDay: number;
  desiredRetention: number;
  newCardOrder: NewCardOrder;
  includeNoAnswer: boolean; // include cards with 正答値表に記載なし in review
  lastExportAt: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 20,
  reviewsPerDay: 200,
  desiredRetention: 0.9,
  newCardOrder: "random",
  includeNoAnswer: false,
  lastExportAt: null,
};
