import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import DeckFilter from "../components/DeckFilter.tsx";
import LoadStatus from "../components/LoadStatus.tsx";
import { BACKUP_REMINDER_DAYS, needsBackupReminder } from "../lib/backup.ts";
import { filterCards } from "../lib/filter.ts";
import { buildQueue, queueCounts } from "../scheduler/queue.ts";
import { useContentStore } from "../store/content.ts";
import { useStudyStore } from "../store/study.ts";

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
      <h1 className="text-xl font-bold">ホーム</h1>
      <LoadStatus content={content.status} study={status} error={content.error ?? error} />

      {data && needsBackupReminder(data.settings.lastExportAt, data.progress.size > 0, new Date()) && (
        <p role="note" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {data.settings.lastExportAt ? `最後のバックアップから${BACKUP_REMINDER_DAYS}日以上たちました。` : "まだバックアップしていません。"}
          学習の記録はこの端末にだけ保存されています。
          <Link to="/settings" className="ml-1 font-bold underline">
            設定で書き出す
          </Link>
        </p>
      )}

      {counts && queue && (
        <>
          <div className="mt-4">
            <DeckFilter cards={content.cards} value={filter} onChange={setFilter} />
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "新規", value: counts.new, tone: "text-sky-700" },
              { label: "学習中", value: counts.learning, tone: "text-rose-700" },
              { label: "復習", value: counts.review, tone: "text-emerald-700" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3">
                <dt className="text-sm text-slate-600">{item.label}</dt>
                <dd className={`text-2xl font-bold ${item.tone}`}>{item.value}</dd>
              </div>
            ))}
          </dl>

          {total > 0 ? (
            <Link
              to="/review"
              className="mt-6 flex min-h-12 items-center justify-center rounded-lg bg-teal-700 px-4 font-bold text-white"
            >
              学習を始める
            </Link>
          ) : (
            <p className="mt-6 rounded-lg bg-white p-4 text-center text-slate-600">
              今日の学習はありません。
              {queue.laterToday > 0 && <span className="block text-sm">あと{queue.laterToday}枚の学習中カードが今日中に出題されます。</span>}
            </p>
          )}
        </>
      )}
    </section>
  );
}
