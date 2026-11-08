// Study state shared by Home and Review: the chosen deck/filters and today's progress.
// All progress access goes through progressRepository and ReviewService.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ALL_CARDS, type CardFilter } from "../lib/filter.ts";
import { progressRepository } from "../repositories/index.ts";
import { dayStart } from "../scheduler/day.ts";
import { ReviewService } from "../scheduler/reviewService.ts";
import type { Card } from "../types/card.ts";
import type { Progress, Rating, ReviewLog, Settings } from "../types/progress.ts";

export const reviewService = new ReviewService(progressRepository);

export type StudyData = {
  progress: ReadonlyMap<string, Progress>;
  logs: ReviewLog[]; // entries of the current study day
  settings: Settings;
  loadedAt: Date;
};

type StudyState = {
  filter: CardFilter;
  setFilter: (filter: CardFilter) => void;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  data: StudyData | null;
  refresh: () => Promise<void>;
  rate: (card: Card, rating: Rating, answer: { selected?: number[]; correct?: boolean }) => Promise<void>;
  undo: () => Promise<string | undefined>;
  setSuspended: (card: Card, suspended: boolean) => Promise<void>;
};

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      filter: ALL_CARDS,
      setFilter: (filter) => set({ filter }),
      status: "idle",
      error: null,
      data: null,

      refresh: async () => {
        if (!get().data) set({ status: "loading" });
        try {
          const now = new Date();
          const [all, logs, settings] = await Promise.all([
            progressRepository.getAllProgress(),
            progressRepository.getReviewLogs(dayStart(now).toISOString()),
            progressRepository.getSettings(),
          ]);
          set({
            status: "ready",
            error: null,
            data: { progress: new Map(all.map((p) => [p.cardId, p])), logs, settings, loadedAt: now },
          });
        } catch (error) {
          set({ status: "error", error: error instanceof Error ? error.message : String(error) });
        }
      },

      // Each action is saved before the state refreshes, so leaving mid-session loses nothing.
      rate: async (card, rating, answer) => {
        await reviewService.rate(card, rating, answer);
        await get().refresh();
      },
      undo: async () => {
        const cardId = await reviewService.undoLast();
        await get().refresh();
        return cardId;
      },
      setSuspended: async (card, suspended) => {
        await reviewService.setSuspended(card, suspended);
        await get().refresh();
      },
    }),
    {
      name: "nurse-past-exam:study", // per-device convenience only: the last chosen filter
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ filter: state.filter }),
    },
  ),
);
