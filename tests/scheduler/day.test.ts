import { describe, expect, it } from "vitest";
import { dayKey, dayStart, nextDayStart } from "../../src/scheduler/day.ts";

const at = (iso: string) => new Date(`${iso}+09:00`);

describe("study day (rolls over at 04:00, Asia/Tokyo in tests)", () => {
  it("starts at 04:00 today after 04:00", () => {
    expect(dayStart(at("2026-11-08T10:00:00"))).toEqual(at("2026-11-08T04:00:00"));
    expect(dayStart(at("2026-11-08T04:00:00"))).toEqual(at("2026-11-08T04:00:00"));
  });

  it("belongs to the previous day before 04:00", () => {
    expect(dayStart(at("2026-11-09T03:59:59"))).toEqual(at("2026-11-08T04:00:00"));
    expect(dayKey(at("2026-11-09T03:59:59"))).toBe("2026-11-08");
    expect(dayKey(at("2026-11-09T04:00:00"))).toBe("2026-11-09");
  });

  it("ends at 04:00 the next day, across month ends", () => {
    expect(nextDayStart(at("2026-11-08T23:00:00"))).toEqual(at("2026-11-09T04:00:00"));
    expect(nextDayStart(at("2026-12-01T02:00:00"))).toEqual(at("2026-12-01T04:00:00"));
  });
});
