import { describe, expect, it } from "vitest";
import { formatInterval, newFsrsState, previewDue, schedule } from "../../src/scheduler/fsrs.ts";

const now = new Date("2026-11-08T10:00:00+09:00");
const minutes = (from: Date, to: string | Date) => (new Date(to).getTime() - from.getTime()) / 60_000;

describe("schedule", () => {
  it("starts a new card in learning with the default steps", () => {
    expect(newFsrsState(now)).toMatchObject({ state: 0, reps: 0, due: now.toISOString() });
    const again = schedule(undefined, 1, now, 0.9);
    const good = schedule(undefined, 3, now, 0.9);
    expect(again.state).toBe(1);
    expect(minutes(now, again.due)).toBe(1);
    expect(good.state).toBe(1);
    expect(minutes(now, good.due)).toBe(10);
    expect(good.last_review).toBe(now.toISOString());
  });

  it("graduates to review and lengthens intervals", () => {
    const easy = schedule(undefined, 4, now, 0.9);
    expect(easy.state).toBe(2);
    expect(easy.scheduled_days).toBeGreaterThan(1);

    const learning = schedule(undefined, 3, now, 0.9);
    const later = new Date(learning.due);
    const review = schedule(learning, 3, later, 0.9);
    expect(review.state).toBe(2);
    expect(review.reps).toBe(2);
  });

  it("gives shorter intervals at higher desired retention", () => {
    const review = schedule(undefined, 4, now, 0.9);
    const next = new Date(review.due);
    const at90 = schedule(review, 3, next, 0.9);
    const at97 = schedule(review, 3, next, 0.97);
    expect(new Date(at97.due).getTime()).toBeLessThan(new Date(at90.due).getTime());
  });

  it("stores plain JSON (ISO strings, no Date objects)", () => {
    const state = schedule(undefined, 3, now, 0.9);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe("previewDue", () => {
  it("gives a due date per rating, increasing from もう一度 to 簡単", () => {
    const due = previewDue(undefined, now, 0.9);
    expect(minutes(now, due[1])).toBe(1);
    expect(minutes(now, due[3])).toBe(10);
    expect(due[1] < due[2] && due[2] < due[3] && due[3] < due[4]).toBe(true);
  });
});

describe("formatInterval", () => {
  const after = (ms: number) => new Date(now.getTime() + ms);
  it.each([
    [30_000, "1分"],
    [10 * 60_000, "10分"],
    [3 * 3_600_000, "3時間"],
    [3 * 86_400_000, "3日"],
    [60 * 86_400_000, "2か月"],
    [548 * 86_400_000, "1.5年"],
  ])("%d ms -> %s", (ms, label) => {
    expect(formatInterval(now, after(ms))).toBe(label);
  });
});
