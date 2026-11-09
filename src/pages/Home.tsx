import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import DeckFilter from "../components/DeckFilter.tsx";
import Icon from "../components/Icon.tsx";
import LoadStatus from "../components/LoadStatus.tsx";
import PageHeader from "../components/PageHeader.tsx";
import { BACKUP_REMINDER_DAYS, needsBackupReminder } from "../lib/backup.ts";
import { filterCards } from "../lib/filter.ts";
import { buildQueue, queueCounts } from "../scheduler/queue.ts";
import { useContentStore } from "../store/content.ts";
import { useStudyStore } from "../store/study.ts";

const today = () => new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });

function greeting(hour = new Date().getHours()): string {
  if (hour >= 4 && hour < 11) return "おはようございます。";
  if (hour >= 11 && hour < 18) return "こんにちは。";
  return "こんばんは。";
}

export default function Home() {
  const content = useContentStore();
  const { filter, setFilter, data, status, error, refresh } = useStudyStore();

  useEffect(() => {
    void content.load();
    void refresh();
  }, [content.load, refresh]);

  const queue = useMemo(() => {
    if (content.status !== "ready" || !data) return null;
    return buildQueue(filterCards(content.cards, filter), data.progress, data.logs, data.settings, new Date());
  }, [content.status, content.cards, data, filter]);

  const counts = queue ? queueCounts(queue) : null;
  const total = counts ? counts.learning + counts.review + counts.new : 0;

  return (
    <section>
      <PageHeader title="ホーム" subtitle={today()} />
      <LoadStatus content={content.status} study={status} error={content.error ?? error} />

      {data && needsBackupReminder(data.settings.lastExportAt, data.progress.size > 0, new Date()) && (
        <p
          role="note"
          className="mt-4 flex gap-2 rounded-2xl bg-warn-soft p-4 text-sm leading-relaxed text-warn-ink"
        >
          <Icon name="info" className="mt-0.5 size-4 shrink-0" />
          <span>
            {data.settings.lastExportAt ? `最後のバックアップから${BACKUP_REMINDER_DAYS}日以上たちました。` : "まだバックアップしていません。"}
            学習の記録はこの端末にだけ保存されています。
            <Link to="/settings" className="ml-1 font-bold underline underline-offset-2">
              設定で書き出す
            </Link>
          </span>
        </p>
      )}

      {counts && queue && (
        <>
          <div className="card mt-4 p-5">
            <p className="text-ink-2">
              {greeting()}
              {total > 0 ? "今日の目標です。" : ""}
            </p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-5xl font-bold tracking-tight tabular-nums">{total}</span>
              <span className="text-ink-2">問</span>
            </p>

            <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl bg-surface-muted py-3">
              {[
                { label: "新規", value: counts.new, dot: "bg-info" },
                { label: "学習中", value: counts.learning, dot: "bg-bad" },
                { label: "復習", value: counts.review, dot: "bg-good" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center">
                  <dt className="flex items-center gap-1.5 text-sm text-ink-2">
                    <span className={`size-2 rounded-full ${item.dot}`} aria-hidden="true" />
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 text-2xl font-bold tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>

            {total > 0 ? (
              <Link to="/review" className="btn btn-primary mt-5 min-h-13 w-full text-lg">
                学習を始める
              </Link>
            ) : (
              <p className="mt-5 rounded-xl bg-brand-soft p-4 text-center text-brand-ink">
                今日の学習はありません。おつかれさまでした。
                {queue.laterToday > 0 && (
                  <span className="mt-1 block text-sm">学習中の問題があと{queue.laterToday}問、今日中に出題されます。</span>
                )}
              </p>
            )}
          </div>

          <section aria-labelledby="scope" className="card mt-4 p-4">
            <h2 id="scope" className="mb-3 font-bold">
              出題範囲
            </h2>
            <DeckFilter cards={content.cards} value={filter} onChange={setFilter} />
          </section>
        </>
      )}
    </section>
  );
}
