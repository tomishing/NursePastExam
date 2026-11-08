// @vitest-environment node
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { NursePastExamDB } from "../../src/db/database.ts";
import { DexieProgressRepository } from "../../src/db/dexieProgressRepository.ts";
import { buildQueue } from "../../src/scheduler/queue.ts";
import { ReviewService } from "../../src/scheduler/reviewService.ts";
import { DEFAULT_SETTINGS } from "../../src/types/progress.ts";
import { makeCard } from "../helpers/cards.ts";

const at = (iso: string) => new Date(`${iso}+09:00`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let dbCount = 0;
let repo: DexieProgressRepository;
let now: Date;
let service: ReviewService;

beforeEach(() => {
  repo = new DexieProgressRepository(new NursePastExamDB(`test-${++dbCount}`));
  now = at("2026-11-08T10:00:00");
  service = new ReviewService(repo, () => now);
});

const cardA = makeCard({ id: "ph-98-AM-1", contentHash: "hash-a" });
const cardB = makeCard({ id: "ph-98-AM-2", contentHash: "hash-b" });

describe("rate", () => {
  it("saves progress and appends a log entry with a UUID", async () => {
    await service.rate(cardA, 3, { selected: [2], correct: true });
    const progress = await repo.getProgress(cardA.id);
    expect(progress).toMatchObject({ cardId: cardA.id, suspended: false, lastContentHash: "hash-a", updatedAt: now.toISOString() });
    expect(progress?.fsrs.state).toBe(1);

    const [entry, ...rest] = await repo.getReviewLogs();
    expect(rest).toEqual([]);
    expect(entry).toMatchObject({ cardId: cardA.id, rating: 3, selected: [2], correct: true, previous: null });
    expect(entry?.id).toMatch(UUID);
  });

  it("keeps the previous state in the log and updates the content hash", async () => {
    await service.rate(cardA, 3);
    now = at("2026-11-08T10:10:00");
    await service.rate({ ...cardA, contentHash: "hash-a2" }, 3);
    const logs = await repo.getReviewLogs();
    expect(logs).toHaveLength(2);
    expect(logs[1]?.previous?.fsrs.state).toBe(1);
    expect((await repo.getProgress(cardA.id))?.lastContentHash).toBe("hash-a2");
    expect((await repo.getProgress(cardA.id))?.fsrs.state).toBe(2);
  });

  it("omits selected and correct when nothing was graded", async () => {
    await service.rate(cardA, 1);
    const [entry] = await repo.getReviewLogs();
    expect(entry).not.toHaveProperty("selected");
    expect(entry).not.toHaveProperty("correct");
  });
});

describe("undoLast", () => {
  it("removes progress for a card that was new and appends an undo entry", async () => {
    await service.rate(cardA, 3);
    now = at("2026-11-08T10:01:00");
    expect(await service.undoLast()).toBe(cardA.id);
    expect(await repo.getProgress(cardA.id)).toBeUndefined();

    const logs = await repo.getReviewLogs();
    expect(logs).toHaveLength(2); // append-only
    expect(logs[1]).toMatchObject({ undoneId: logs[0]?.id, cardId: cardA.id, reviewedAt: now.toISOString() });
    expect(logs[1]?.previous?.fsrs.state).toBe(1);
  });

  it("restores the earlier state of a card that had been reviewed", async () => {
    await service.rate(cardA, 3);
    const before = await repo.getProgress(cardA.id);
    now = at("2026-11-08T10:10:00");
    await service.rate(cardA, 1);
    now = at("2026-11-08T10:11:00");
    await service.undoLast();
    const restored = await repo.getProgress(cardA.id);
    expect(restored?.fsrs).toEqual(before?.fsrs);
    expect(restored?.updatedAt).toBe(now.toISOString());
  });

  it("undoes ratings one at a time, newest first", async () => {
    await service.rate(cardA, 3);
    now = at("2026-11-08T10:01:00");
    await service.rate(cardB, 3);
    expect(await service.undoLast()).toBe(cardB.id);
    expect(await service.undoLast()).toBe(cardA.id);
    expect(await service.undoLast()).toBeUndefined();
    expect(await repo.getAllProgress()).toEqual([]);
    expect(await repo.getReviewLogs()).toHaveLength(4);
  });

  it("frees the daily new-card slot again", async () => {
    const settings = { ...DEFAULT_SETTINGS, newPerDay: 1 };
    await service.rate(cardA, 3);
    const after = async () => buildQueue([cardB], new Map(), await repo.getReviewLogs(), settings, now).new.length;
    expect(await after()).toBe(0);
    await service.undoLast();
    expect(await after()).toBe(1);
  });

  it("does not undo a rating from the previous study day", async () => {
    now = at("2026-11-08T03:00:00");
    await service.rate(cardA, 3);
    now = at("2026-11-08T04:30:00");
    expect(await service.undoLast()).toBeUndefined();
    expect(await repo.getProgress(cardA.id)).toBeDefined();
  });
});

describe("setSuspended", () => {
  it("suspends a card never reviewed and restores it", async () => {
    await service.setSuspended(cardA, true);
    expect(await repo.getProgress(cardA.id)).toMatchObject({ suspended: true, fsrs: { state: 0 } });
    expect(buildQueue([cardA], new Map((await repo.getAllProgress()).map((p) => [p.cardId, p])), [], DEFAULT_SETTINGS, now).new).toEqual([]);
    await service.setSuspended(cardA, false);
    expect((await repo.getProgress(cardA.id))?.suspended).toBe(false);
  });

  it("keeps the schedule when suspending a reviewed card", async () => {
    await service.rate(cardA, 4);
    const fsrs = (await repo.getProgress(cardA.id))?.fsrs;
    await service.setSuspended(cardA, true);
    expect((await repo.getProgress(cardA.id))?.fsrs).toEqual(fsrs);
  });
});

describe("settings", () => {
  it("returns defaults and saves changes", async () => {
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS);
    const saved = await repo.saveSettings({ newPerDay: 10, newCardOrder: "oldest" });
    expect(saved).toEqual({ ...DEFAULT_SETTINGS, newPerDay: 10, newCardOrder: "oldest" });
    expect(await repo.getSettings()).toEqual(saved);
  });
});

describe("getReviewLogs", () => {
  it("filters by time and returns oldest first", async () => {
    now = at("2026-11-07T20:00:00");
    await service.rate(cardB, 3);
    now = at("2026-11-08T10:00:00");
    await service.rate(cardA, 3);
    const today = await repo.getReviewLogs(at("2026-11-08T04:00:00").toISOString());
    expect(today.map((l) => l.cardId)).toEqual([cardA.id]);
    expect((await repo.getReviewLogs()).map((l) => l.cardId)).toEqual([cardB.id, cardA.id]);
  });
});
