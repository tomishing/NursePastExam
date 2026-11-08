// The repository instances the app uses. Swap implementations here only.
import type { ContentRepository } from "./ContentRepository.ts";
import { JsonContentRepository } from "./jsonContentRepository.ts";

export const contentRepository: ContentRepository = new JsonContentRepository();
