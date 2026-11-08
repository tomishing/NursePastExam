import { describe, expect, it } from "vitest";
import { matchesSearch } from "../src/lib/search.ts";
import { answerAccuracy, cardStatus, progressByCategory, retention, reviewsPerDay } from "../src/lib/stats.ts";
import { newFsrsState } from "../src/scheduler/fsrs.ts";
import type { FsrsStateValue, Progress, ReviewLog } from "../src/types/progress.ts";
import { makeCard } from "./helpers/cards.ts";

const at = (iso: string) => new Date(`${iso}+09:00`);
const NOW = at("2026-11-08T10:00:00");

function progress(cardId: string, state: FsrsStateValue, suspended = false): Progress {
  return { cardId, fsrs: { ...newFsrsState(NOW), state }, suspended, lastContentHash: "h", updatedAt: NOW.toISOString() };
}

let n = 0;
function log(when: string, rating: 1 | 2 | 3 | 4, previous: FsrsStateValue | null, extra: Partial<ReviewLog> = {}): ReviewLog {
  return { id: `l${++n}`, cardId: "c", rating, reviewedAt: at(when).toISOString(), previous: previous === null ? null : progress("c", previous), ...extra };
}

describe("cardStatus", () => {
  it("classifies progress records", () => {
    expect(cardStatus(undefined)).toBe("new");
    expect(cardStatus(progress("a", 0))).toBe("new");
    expect(cardStatus(progress("a", 1))).toBe("learning");
    expect(cardStatus(progress("a", 3))).toBe("learning");
    expect(cardStatus(progress("a", 2))).toBe("review");
    expect(cardStatus(progress("a", 2, true))).toBe("suspended");
  });
});

describe("reviewsPerDay", () => {
  it("counts ratings per study day, including empty days and the 04:00 rollover", () => {
    const rated = log("2026-11-08T09:00:00", 3, null);
    const logs = [
      log("2026-11-06T12:00:00", 3, null),
      log("2026-11-08T03:00:00", 3, null), // still 11-07
      rated,
      log("2026-11-08T09:30:00", 3, 1),
      log("2026-11-08T09:31:00", 3, 1, { undoneId: rated.id }),
    ];
    expect(reviewsPerDay(logs, NOW, 4)).toEqual([
      { day: "2026-11-05", count: 0 },
      { day: "2026-11-06", count: 1 },
      { day: "2026-11-07", count: 1 },
      { day: "2026-11-08", count: 1 },
    ]);
  });
});

describe("retention", () => {
  it("is the share of review-state reviews not rated もう一度", () => {
    const logs = [
      log("2026-11-08T09:00:00", 3, 2),
      log("2026-11-08T09:01:00", 1, 2),
      log("2026-11-08T09:02:00", 4, 2),
      log("2026-11-08T09:03:00", 1, 1), // learning, not counted
      log("2026-11-08T09:04:00", 3, null), // new, not counted
      log("2026-09-01T09:00:00", 1, 2), // outside 30 days
    ];
    expect(retention(logs, NOW, 30)).toEqual({ rate: 2 / 3, reviews: 3 });
    expect(retention([], NOW, 30)).toEqual({ rate: null, reviews: 0 });
  });
});

describe("answerAccuracy", () => {
  it("counts only graded answers", () => {
    const logs = [log("2026-11-08T09:00:00", 3, null, { correct: true }), log("2026-11-08T09:01:00", 3, null, { correct: false }), log("2026-11-08T09:02:00", 3, null)];
    expect(answerAccuracy(logs)).toEqual({ rate: 0.5, graded: 2 });
  });
});

describe("progressByCategory", () => {
  it("counts cards by status for each deck and category", () => {
    const cards = [
      makeCard({ id: "a", deck: "ph", category: "疫学" }),
      makeCard({ id: "b", deck: "ph", category: "疫学" }),
      makeCard({ id: "c", deck: "nurse", category: "公衆衛生" }),
    ];
    const map = new Map([
      ["a", progress("a", 2)],
      ["b", progress("b", 0, true)], // suspended before ever being studied
      ["c", progress("c", 1, true)],
    ]);
    expect(progressByCategory(cards, map)).toEqual([
      { deck: "ph", category: "疫学", total: 2, studied: 1, new: 0, learning: 0, review: 1, suspended: 1 },
      { deck: "nurse", category: "公衆衛生", total: 1, studied: 1, new: 0, learning: 0, review: 0, suspended: 1 },
    ]);
  });
});

describe("matchesSearch", () => {
  const card = makeCard({ id: "ph-102-AM-20", question: "国連児童基金<UNICEF>について正しいのはどれか。", choices: ["結核", "ＷＨＯ"] });
  it("matches ID, question and choices, ignoring width and case, with every term required", () => {
    expect(matchesSearch(card, "")).toBe(true);
    expect(matchesSearch(card, "ph-102-am-20")).toBe(true);
    expect(matchesSearch(card, "<UNICEF>")).toBe(true);
    expect(matchesSearch(card, "who")).toBe(true);
    expect(matchesSearch(card, "UNICEF 結核")).toBe(true);
    expect(matchesSearch(card, "UNICEF 麻疹")).toBe(false);
  });
});
