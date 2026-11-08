import type { CardsFile } from "../types/card.ts";

/**
 * All card content is loaded through this interface, so a server-backed
 * implementation can replace the bundled JSON later (CLAUDE.md rules).
 */
export interface ContentRepository {
  loadCards(): Promise<CardsFile>;
}

export class ContentNotFoundError extends Error {
  constructor() {
    super("Card data not found. Run `npm run import` to generate public/data/cards.json.");
    this.name = "ContentNotFoundError";
  }
}
