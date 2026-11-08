import { describe, expect, it } from "vitest";
import { buildQueue, effectiveRatings, nextCard, queueCounts, todayCounts } from "../../src/scheduler/queue.ts";
import { newFsrsState } from "../../src/scheduler/fsrs.ts";
import type { Card } from "../../src/types/card.ts";
import { DEFAULT_SETTINGS, type FsrsStateValue, type Progress, type ReviewLog, type Settings } from "../../src/types/progress.ts";
import { makeCard } from "../helpers/cards.ts";

const at = (iso: string) => new Date(`${iso}+09:00`);
const NOW = at("2026-11-08T10:00:00");

function card(id: string, extra: Partial<Card> = {}): Card {
  return makeCard({ id, ...extra });
}

function progress(cardId: string, state: FsrsStateValue, due: Date, extra: Partial<Progress> = {}): Progress {
  return {
    cardId,
    fsrs: { ...newFsrsState(due), state, due: due.toISOString(), reps: state === 0 ? 0 : 1 },
    suspended: false,
    lastContentHash: "x",
    updatedAt: due.toISOString(),
    ...extra,
  };
}

let logCount = 0;
function log(cardId: string, reviewedAt: Date, previousState: FsrsStateValue | null, extra: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: `log-${++logCount}`,
    cardId,
    rating: 3,
    reviewedAt: reviewedAt.toISOString(),
    previous: previousState === null ? null : progress(cardId, previousState, reviewedAt),
    ...extra,
  };
}

const settings = (changes: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, newCardOrder: "oldest", ...changes });
const ids = (cards: Card[]) => cards.map((c) => c.id);

describe("buildQueue", () => {
  it("orders learning, then due reviews, then new cards", () => {
    const cards = [card("new-1", { q: 1 }), card("rev-1"), card("learn-1"), card("new-2", { q: 2 })];
    const map = new Map([
      ["rev-1", progress("rev-1", 2, at("2026-11-08T09:00:00"))],
      ["learn-1", progress("learn-1", 1, at("2026-11-08T09:55:00"))],
    ]);
    const queue = buildQueue(cards, map, [], settings(), NOW);
    expect(ids(queue.learning)).toEqual(["learn-1"]);
    expect(ids(queue.review)).toEqual(["rev-1"]);
    expect(ids(queue.new)).toEqual(["new-1", "new-2"]);
    expect(nextCard(queue)?.id).toBe("learn-1");
  });

  it("sorts learning and reviews by due time", () => {
    const cards = ["a", "b", "c", "d"].map((id) => card(id));
    const map = new Map([
      ["a", progress("a", 2, at("2026-11-08T08:00:00"))],
      ["b", progress("b", 2, at("2026-11-07T08:00:00"))],
      ["c", progress("c", 3, at("2026-11-08T10:05:00"))],
      ["d", progress("d", 1, at("2026-11-08T09:00:00"))],
    ]);
    const queue = buildQueue(cards, map, [], settings(), NOW);
    expect(ids(queue.review)).toEqual(["b", "a"]);
    expect(ids(queue.learning)).toEqual(["d"]);
    expect(ids(queue.learnAhead)).toEqual(["c"]);
  });

  it("shows learning cards that are not yet due only after everything else", () => {
    const cards = [card("again"), card("rev"), card("new", { q: 1 })];
    const map = new Map([
      ["again", progress("again", 3, at("2026-11-08T10:01:00"))],
      ["rev", progress("rev", 2, at("2026-11-08T09:00:00"))],
    ]);
    const queue = buildQueue(cards, map, [], settings(), NOW);
    expect(nextCard(queue)?.id).toBe("rev");
    expect(nextCard({ ...queue, review: [], new: [] })?.id).toBe("again");
    expect(queueCounts(queue)).toEqual({ learning: 1, review: 1, new: 1 });
  });

  it("includes reviews due before 04:00 tomorrow, not after", () => {
    const cards = [card("tonight"), card("before-4"), card("tomorrow")];
    const map = new Map([
      ["tonight", progress("tonight", 2, at("2026-11-08T22:00:00"))],
      ["before-4", progress("before-4", 2, at("2026-11-09T03:59:00"))],
      ["tomorrow", progress("tomorrow", 2, at("2026-11-09T04:00:00"))],
    ]);
    expect(ids(buildQueue(cards, map, [], settings(), NOW).review)).toEqual(["tonight", "before-4"]);
  });

  it("shows learning cards within 20 minutes and counts later ones", () => {
    const cards = [card("soon"), card("later")];
    const map = new Map([
      ["soon", progress("soon", 1, at("2026-11-08T10:20:00"))],
      ["later", progress("later", 1, at("2026-11-08T11:00:00"))],
    ]);
    const queue = buildQueue(cards, map, [], settings(), NOW);
    expect(ids(queue.learnAhead)).toEqual(["soon"]);
    expect(queue.laterToday).toBe(1);
  });

  it("leaves out suspended cards, and cards with no official answer unless included", () => {
    const cards = [card("susp"), card("none", { answer: { type: "none" } }), card("ok")];
    const map = new Map([["susp", progress("susp", 0, NOW, { suspended: true })]]);
    expect(ids(buildQueue(cards, map, [], settings(), NOW).new)).toEqual(["ok"]);
    expect(ids(buildQueue(cards, map, [], settings({ includeNoAnswer: true }), NOW).new)).toEqual(["none", "ok"]);
  });

  it("treats a progress record in the New state as new", () => {
    const map = new Map([["a", progress("a", 0, NOW)]]);
    expect(ids(buildQueue([card("a")], map, [], settings(), NOW).new)).toEqual(["a"]);
  });
});

describe("daily limits", () => {
  const fresh = Array.from({ length: 30 }, (_, i) => card(`n${i}`, { q: i + 1 }));

  it("limits new cards and subtracts those already started today", () => {
    expect(buildQueue(fresh, new Map(), [], settings(), NOW).new).toHaveLength(20);
    const logs = [log("x1", at("2026-11-08T08:00:00"), null), log("x2", at("2026-11-08T09:00:00"), 0)];
    expect(buildQueue(fresh, new Map(), logs, settings(), NOW).new).toHaveLength(18);
    expect(buildQueue(fresh, new Map(), logs, settings({ newPerDay: 1 }), NOW).new).toHaveLength(0);
  });

  it("limits reviews and subtracts those done today", () => {
    const cards = Array.from({ length: 5 }, (_, i) => card(`r${i}`));
    const map = new Map(cards.map((c) => [c.id, progress(c.id, 2, at("2026-11-08T08:00:00"))]));
    const logs = [log("y", at("2026-11-08T09:00:00"), 2), log("z", at("2026-11-08T09:10:00"), 1)];
    expect(buildQueue(cards, map, logs, settings({ reviewsPerDay: 4 }), NOW).review).toHaveLength(3);
  });

  it("does not limit learning cards", () => {
    const cards = Array.from({ length: 3 }, (_, i) => card(`l${i}`));
    const map = new Map(cards.map((c) => [c.id, progress(c.id, 1, NOW)]));
    expect(buildQueue(cards, map, [], settings({ newPerDay: 0, reviewsPerDay: 0 }), NOW).learning).toHaveLength(3);
  });

  it("resets at 04:00: ratings before 04:00 belong to the previous day", () => {
    const logs = [log("a", at("2026-11-08T03:30:00"), null), log("b", at("2026-11-08T04:30:00"), null)];
    expect(todayCounts(logs, at("2026-11-08T03:45:00"))).toEqual({ newStudied: 1, reviewsDone: 0 });
    expect(todayCounts(logs, at("2026-11-08T10:00:00"))).toEqual({ newStudied: 1, reviewsDone: 0 });
    expect(todayCounts(logs, at("2026-11-09T04:00:00"))).toEqual({ newStudied: 0, reviewsDone: 0 });
    expect(buildQueue(fresh, new Map(), logs, settings({ newPerDay: 2 }), at("2026-11-08T03:45:00")).new).toHaveLength(1);
  });

  it("does not count undone ratings", () => {
    const rated = log("a", at("2026-11-08T08:00:00"), null);
    const undo = log("a", at("2026-11-08T08:01:00"), 1, { undoneId: rated.id });
    expect(effectiveRatings([rated, undo])).toEqual([]);
    expect(todayCounts([rated, undo], NOW)).toEqual({ newStudied: 0, reviewsDone: 0 });
  });
});

describe("new card order", () => {
  const cards = [card("c", { year: 2020, q: 1 }), card("a", { year: 2010, q: 5 }), card("b", { year: 2010, q: 7 })];

  it("supports oldest-first and newest-first", () => {
    expect(ids(buildQueue(cards, new Map(), [], settings({ newCardOrder: "oldest" }), NOW).new)).toEqual(["a", "b", "c"]);
    expect(ids(buildQueue(cards, new Map(), [], settings({ newCardOrder: "newest" }), NOW).new)).toEqual(["c", "b", "a"]);
  });

  it("shuffles randomly but stays the same within a study day", () => {
    const many = Array.from({ length: 50 }, (_, i) => card(`k${i}`, { q: i }));
    const s = settings({ newCardOrder: "random", newPerDay: 50 });
    const morning = ids(buildQueue(many, new Map(), [], s, at("2026-11-08T05:00:00")).new);
    const evening = ids(buildQueue(many, new Map(), [], s, at("2026-11-09T03:00:00")).new);
    const nextDay = ids(buildQueue(many, new Map(), [], s, at("2026-11-09T05:00:00")).new);
    expect(evening).toEqual(morning);
    expect(nextDay).not.toEqual(morning);
    expect(morning).not.toEqual(ids(many));
    expect([...morning].sort()).toEqual(ids(many).sort());
  });
});
