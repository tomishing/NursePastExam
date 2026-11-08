import type { CardsFile } from "../types/card.ts";
import { ContentNotFoundError, type ContentRepository } from "./ContentRepository.ts";

/** Loads the cards bundled with the app at public/data/cards.json. */
export class JsonContentRepository implements ContentRepository {
  private cached: Promise<CardsFile> | null = null;

  constructor(private readonly url: string = `${import.meta.env.BASE_URL}data/cards.json`) {}

  loadCards(): Promise<CardsFile> {
    this.cached ??= this.fetchCards().catch((error: unknown) => {
      this.cached = null; // allow a retry
      throw error;
    });
    return this.cached;
  }

  private async fetchCards(): Promise<CardsFile> {
    const response = await fetch(this.url);
    // The dev server answers a missing file with index.html, so check the type too.
    if (response.status === 404 || !(response.headers.get("content-type") ?? "").includes("json")) {
      throw new ContentNotFoundError();
    }
    if (!response.ok) throw new Error(`Failed to load cards: HTTP ${response.status}`);
    return (await response.json()) as CardsFile;
  }
}
