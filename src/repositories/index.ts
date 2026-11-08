// The repository instances the app uses. Swap implementations here only.
import { DexieProgressRepository } from "../db/dexieProgressRepository.ts";
import type { ContentRepository } from "./ContentRepository.ts";
import { JsonContentRepository } from "./jsonContentRepository.ts";
import type { ProgressRepository } from "./ProgressRepository.ts";

export const contentRepository: ContentRepository = new JsonContentRepository();
export const progressRepository: ProgressRepository = new DexieProgressRepository();
