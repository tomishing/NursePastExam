import { describe, expect, it } from "vitest";
import { BackupError, backupFileName, createBackup, needsBackupReminder, parseBackup, SCHEMA_VERSION } from "../src/lib/backup.ts";
import { newFsrsState } from "../src/scheduler/fsrs.ts";
import { DEFAULT_SETTINGS, type Progress, type ReviewLog } from "../src/types/progress.ts";

const now = new Date("2026-11-08T10:00:00+09:00");
const progress: Progress = { cardId: "ph-98-AM-1", fsrs: newFsrsState(now), suspended: false, lastContentHash: "h", updatedAt: now.toISOString() };
const log: ReviewLog = { id: "11111111-1111-4111-8111-111111111111", cardId: "ph-98-AM-1", rating: 3, reviewedAt: now.toISOString(), previous: null };
const backup = createBackup({ progress: [progress], reviewLog: [log], settings: { ...DEFAULT_SETTINGS, newPerDay: 5 } }, now);

describe("backup file", () => {
  it("round-trips through JSON", () => {
    expect(backup).toMatchObject({ schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString() });
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it("names the file by date", () => {
    expect(backupFileName(now)).toBe("nurse-past-exam-backup-2026-11-08.json");
  });

  it("rejects an unknown schema version", () => {
    expect(() => parseBackup(JSON.stringify({ ...backup, schemaVersion: 2 }))).toThrow("対応していないバージョンです（schemaVersion: 2）");
    expect(() => parseBackup(JSON.stringify({ ...backup, schemaVersion: undefined }))).toThrow(BackupError);
  });

  it("rejects files that are not backups", () => {
    expect(() => parseBackup("not json")).toThrow("JSON ファイルとして読み込めません");
    expect(() => parseBackup("[]")).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ schemaVersion: 1, progress: [] }))).toThrow("progress、reviewLog、settings が見つかりません");
    expect(() => parseBackup(JSON.stringify({ ...backup, progress: [{ cardId: 1 }] }))).toThrow("progress[0] の形式が正しくありません");
    expect(() => parseBackup(JSON.stringify({ ...backup, reviewLog: [{ ...log, rating: 7 }] }))).toThrow("reviewLog[0]");
    expect(() => parseBackup(JSON.stringify({ ...backup, reviewLog: [log, log] }))).toThrow("重複した id");
  });

  it("fills in settings added after the backup was made", () => {
    const old = { ...backup, settings: { newPerDay: 5 } };
    expect(parseBackup(JSON.stringify(old)).settings).toEqual({ ...DEFAULT_SETTINGS, newPerDay: 5 });
  });
});

describe("needsBackupReminder", () => {
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
  it("reminds only when there is progress and no export in the last 30 days", () => {
    expect(needsBackupReminder(null, false, now)).toBe(false);
    expect(needsBackupReminder(null, true, now)).toBe(true);
    expect(needsBackupReminder(daysAgo(29), true, now)).toBe(false);
    expect(needsBackupReminder(daysAgo(31), true, now)).toBe(true);
  });
});
