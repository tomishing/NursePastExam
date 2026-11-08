import { create } from "zustand";
import { contentRepository } from "../repositories/index.ts";
import { ContentNotFoundError } from "../repositories/ContentRepository.ts";
import type { Card, SourceEntry } from "../types/card.ts";

type ContentState = {
  status: "idle" | "loading" | "ready" | "missing" | "error";
  cards: Card[];
  sources: SourceEntry[];
  error: string | null;
  load: () => Promise<void>;
};

export const useContentStore = create<ContentState>((set, get) => ({
  status: "idle",
  cards: [],
  sources: [],
  error: null,
  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const file = await contentRepository.loadCards();
      set({ status: "ready", cards: file.cards, sources: file.sources });
    } catch (error) {
      if (error instanceof ContentNotFoundError) set({ status: "missing", error: error.message });
      else set({ status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  },
}));
