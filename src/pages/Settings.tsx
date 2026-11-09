import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Icon from "../components/Icon.tsx";
import LoadStatus from "../components/LoadStatus.tsx";
import PageHeader from "../components/PageHeader.tsx";
import { BackupError, backupFileName, parseBackup, type BackupFile } from "../lib/backup.ts";
import { DECK_LABELS } from "../lib/card.ts";
import { useContentStore } from "../store/content.ts";
import { useStudyStore } from "../store/study.ts";
import type { NewCardOrder, Settings as SettingsType } from "../types/progress.ts";

const RETENTIONS = [0.8, 0.85, 0.9, 0.93, 0.95, 0.97];

function clampInt(value: string, min: number, max: number): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "まだありません";
  return new Date(iso).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}

export default function Settings() {
  const content = useContentStore();
  const study = useStudyStore();
  const settings = study.data?.settings;

  useEffect(() => {
    void content.load();
    void study.refresh();
  }, [content.load, study.refresh]);

  return (
    <section className="space-y-6">
      <PageHeader title="設定" />
      <LoadStatus content={content.status} study={study.status} error={content.error ?? study.error} />
      {settings && (
        <StudySettings
          key={`${settings.newPerDay}/${settings.reviewsPerDay}`}
          settings={settings}
          save={study.saveSettings}
        />
      )}
      {settings && <Backup settings={settings} />}
      {content.status === "ready" && <Attribution />}
    </section>
  );
}

function StudySettings({ settings, save }: { settings: SettingsType; save: (c: Partial<SettingsType>) => Promise<void> }) {
  // Number fields keep their own text so a half-typed value is not saved.
  const [newPerDay, setNewPerDay] = useState(String(settings.newPerDay));
  const [reviewsPerDay, setReviewsPerDay] = useState(String(settings.reviewsPerDay));
  const newValid = clampInt(newPerDay, 0, 999) !== null;
  const reviewsValid = clampInt(reviewsPerDay, 0, 9999) !== null;

  return (
    <section aria-labelledby="study-settings" className="card space-y-4 p-4 sm:p-5">
      <h2 id="study-settings" className="text-lg font-bold">学習</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">1日の新規カード（0〜999）</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            className={`field tabular-nums ${newValid ? "" : "border-bad"}`}
            value={newPerDay}
            onChange={(e) => setNewPerDay(e.target.value)}
            onBlur={() => {
              const n = clampInt(newPerDay, 0, 999);
              if (n !== null && n !== settings.newPerDay) void save({ newPerDay: n });
            }}
          />
        </label>
        <label className="block">
          <span className="field-label">1日の復習上限（0〜9999）</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            className={`field tabular-nums ${reviewsValid ? "" : "border-bad"}`}
            value={reviewsPerDay}
            onChange={(e) => setReviewsPerDay(e.target.value)}
            onBlur={() => {
              const n = clampInt(reviewsPerDay, 0, 9999);
              if (n !== null && n !== settings.reviewsPerDay) void save({ reviewsPerDay: n });
            }}
          />
        </label>
        <label className="block">
          <span className="field-label">目標の定着率</span>
          <select
            className="field"
            value={settings.desiredRetention}
            onChange={(e) => void save({ desiredRetention: Number(e.target.value) })}
          >
            {RETENTIONS.map((r) => (
              <option key={r} value={r}>
                {Math.round(r * 100)}%{r === 0.9 ? "（標準）" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">新規カードの順番</span>
          <select
            className="field"
            value={settings.newCardOrder}
            onChange={(e) => void save({ newCardOrder: e.target.value as NewCardOrder })}
          >
            <option value="random">ランダム</option>
            <option value="oldest">古い回から</option>
            <option value="newest">新しい回から</option>
          </select>
        </label>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-surface-muted p-3">
        <input
          type="checkbox"
          className="size-5 shrink-0 accent-(--brand-strong)"
          checked={settings.includeNoAnswer}
          onChange={(e) => void save({ includeNoAnswer: e.target.checked })}
        />
        <span>正答が公表されていない問題（正答値表に記載なし）も出題する</span>
      </label>
      <p className="text-sm leading-relaxed text-ink-3">目標の定着率を上げると、復習の間隔が短くなり復習の数が増えます。</p>
    </section>
  );
}

function Backup({ settings }: { settings: SettingsType }) {
  const { exportBackup, importBackup } = useStudyStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backupFileName(new Date(backup.exportedAt));
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ text: `書き出しました（記録 ${backup.reviewLog.length}件）。` });
    } catch (error) {
      setMessage({ text: `書き出せませんでした：${error instanceof Error ? error.message : String(error)}`, error: true });
    } finally {
      setBusy(false);
    }
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
      setMessage(null);
    } catch (error) {
      setPending(null);
      setMessage({ text: error instanceof BackupError ? error.message : "読み込めませんでした", error: true });
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(pending);
      setMessage({ text: `読み込みました（問題 ${pending.progress.length}問、記録 ${pending.reviewLog.length}件）。` });
      setPending(null);
    } catch (error) {
      setMessage({ text: `読み込めませんでした：${error instanceof Error ? error.message : String(error)}`, error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="backup" className="card space-y-3 p-4 sm:p-5">
      <h2 id="backup" className="text-lg font-bold">バックアップ</h2>
      <p className="text-sm leading-relaxed text-ink-2">
        学習の記録はこの端末のブラウザにだけ保存されます。ブラウザのデータを消すと失われるため、定期的に書き出してください。
      </p>
      <p className="text-sm">
        <span className="text-ink-3">最後の書き出し：</span>
        {formatDate(settings.lastExportAt)}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-primary" onClick={() => void download()} disabled={busy}>
          <Icon name="download" className="size-4" />
          書き出す
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          <Icon name="upload" className="size-4" />
          読み込む
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void choose(e)} data-testid="backup-file" />
      </div>

      {pending && (
        <div role="alertdialog" aria-labelledby="import-confirm" className="rounded-2xl border border-warn-line bg-warn-soft p-4 text-warn-ink">
          <p id="import-confirm" className="font-bold">現在の学習記録をすべて置き換えますか？</p>
          <p className="mt-1 text-sm leading-relaxed">
            {formatDate(pending.exportedAt)} に書き出したファイルです（問題 {pending.progress.length}問、記録 {pending.reviewLog.length}件）。
            この操作は元に戻せません。
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn bg-warn text-on-warn hover:brightness-[0.97]" onClick={() => void confirmImport()} disabled={busy}>
              置き換える
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setPending(null)} disabled={busy}>
              キャンセル
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className={`text-sm font-medium ${message.error ? "text-bad-ink" : "text-good-ink"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

function Attribution() {
  const sources = useContentStore((s) => s.sources);
  return (
    <section aria-labelledby="attribution" className="card space-y-3 p-4 text-sm leading-relaxed text-ink-2 sm:p-5">
      <h2 id="attribution" className="text-lg font-bold text-ink">出典・ライセンス</h2>
      <p>
        問題・選択肢・正答・図表は、厚生労働省ホームページで公開されている看護師国家試験・保健師国家試験の「問題および正答」を、
        公共データ利用規約（第1.0版）（PDL1.0）に基づいて利用しています。
      </p>
      <p>
        本アプリの作成者が、保健師助産師看護師国家試験出題基準（令和5年版）に基づいて疫学・公衆衛生関連の問題を抽出し、分類・書式変換等の加工を行いました。
        本アプリは厚生労働省の公式のものではありません。
      </p>
      <p>解説は Claude（Anthropic）を使って作成した非公式のもので、十分な確認を経ていません。</p>
      <table className="w-full border-collapse text-left text-ink tabular-nums">
        <caption className="sr-only">各回の出典</caption>
        <thead>
          <tr className="border-b border-line-strong text-xs text-ink-3">
            <th className="py-1.5 font-normal">実施年</th>
            <th className="py-1.5 font-normal">{DECK_LABELS.nurse}</th>
            <th className="py-1.5 font-normal">{DECK_LABELS.ph}</th>
            <th className="py-1.5 font-normal">出典</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.year} className="border-b border-line last:border-0">
              <td className="py-1.5">{s.year}</td>
              <td className="py-1.5">{s.nurse.join("・")}</td>
              <td className="py-1.5">{s.ph.join("・")}</td>
              <td className="py-1.5">
                <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-brand-ink underline underline-offset-2">
                  厚生労働省
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <a href="https://www.mhlw.go.jp/chosakuken/index.html" target="_blank" rel="noreferrer" className="font-medium text-brand-ink underline underline-offset-2">
          厚生労働省ホームページの利用規約
        </a>
        ・
        <a href="https://www.digital.go.jp/resources/open_data/public_data_license_v1.0" target="_blank" rel="noreferrer" className="font-medium text-brand-ink underline underline-offset-2">
          公共データ利用規約（第1.0版）
        </a>
      </p>
    </section>
  );
}
