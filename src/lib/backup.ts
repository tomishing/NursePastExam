// Progress backup file (data_format.md section 6): { schemaVersion, exportedAt, progress, reviewLog, settings }.
// The same format will be used to upload local progress when accounts arrive.
import { DEFAULT_SETTINGS, type Progress, type ReviewLog, type Settings } from "../types/progress.ts";

export const SCHEMA_VERSION = 1;
export const BACKUP_REMINDER_DAYS = 30;

export type BackupFile = {
  schemaVersion: number;
  exportedAt: string;
  progress: Progress[];
  reviewLog: ReviewLog[];
  settings: Settings;
};

export function createBackup(data: Omit<BackupFile, "schemaVersion" | "exportedAt">, now: Date): BackupFile {
  return { schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), ...data };
}

/** e.g. nurse-past-exam-backup-2026-11-08.json */
export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `nurse-past-exam-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export class BackupError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isIso = (v: unknown) => typeof v === "string" && !Number.isNaN(Date.parse(v));

function checkProgress(p: unknown, i: number): Progress {
  if (!isObject(p) || typeof p.cardId !== "string" || !isObject(p.fsrs) || !isIso(p.fsrs.due) || typeof p.suspended !== "boolean") {
    throw new BackupError(`progress[${i}] の形式が正しくありません`);
  }
  return p as Progress;
}

function checkLog(l: unknown, i: number): ReviewLog {
  if (!isObject(l) || typeof l.id !== "string" || typeof l.cardId !== "string" || ![1, 2, 3, 4].includes(l.rating as number) || !isIso(l.reviewedAt)) {
    throw new BackupError(`reviewLog[${i}] の形式が正しくありません`);
  }
  return l as ReviewLog;
}

/** Parses and checks a backup file. Throws BackupError with a Japanese message for the user. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("JSON ファイルとして読み込めません");
  }
  if (!isObject(data)) throw new BackupError("バックアップファイルの形式が正しくありません");
  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw new BackupError(`対応していないバージョンです（schemaVersion: ${String(data.schemaVersion)}）`);
  }
  if (!Array.isArray(data.progress) || !Array.isArray(data.reviewLog) || !isObject(data.settings)) {
    throw new BackupError("progress、reviewLog、settings が見つかりません");
  }
  const progress = data.progress.map(checkProgress);
  const reviewLog = data.reviewLog.map(checkLog);
  if (new Set(progress.map((p) => p.cardId)).size !== progress.length) throw new BackupError("progress に重複した cardId があります");
  if (new Set(reviewLog.map((l) => l.id)).size !== reviewLog.length) throw new BackupError("reviewLog に重複した id があります");
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: isIso(data.exportedAt) ? (data.exportedAt as string) : new Date(0).toISOString(),
    progress,
    reviewLog,
    settings: { ...DEFAULT_SETTINGS, ...(data.settings as Partial<Settings>) },
  };
}

/** Home shows a reminder when there is progress and the last export is missing or older than 30 days. */
export function needsBackupReminder(lastExportAt: string | null, hasProgress: boolean, now: Date): boolean {
  if (!hasProgress) return false;
  if (!lastExportAt) return true;
  return now.getTime() - new Date(lastExportAt).getTime() > BACKUP_REMINDER_DAYS * 86_400_000;
}
