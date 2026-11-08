import { useEffect, useMemo, useState } from "react";
import LoadStatus from "../components/LoadStatus.tsx";
import { DECK_LABELS } from "../lib/card.ts";
import { answerAccuracy, progressByCategory, retention, reviewsPerDay } from "../lib/stats.ts";
import { useContentStore } from "../store/content.ts";
import { useStudyStore } from "../store/study.ts";
import type { ReviewLog } from "../types/progress.ts";

const DAYS = 30;
const percent = (rate: number | null) => (rate === null ? "—" : `${Math.round(rate * 100)}%`);

export default function Stats() {
  const content = useContentStore();
  const study = useStudyStore();
  const [logs, setLogs] = useState<ReviewLog[] | null>(null);

  useEffect(() => {
    void content.load();
    void study.refresh();
    // A storage failure also fails refresh(), which LoadStatus reports.
    study.loadAllLogs().then(setLogs, () => setLogs(null));
  }, [content.load, study.refresh, study.loadAllLogs]);

  const stats = useMemo(() => {
    if (!logs || !study.data || content.status !== "ready") return null;
    const now = new Date();
    const groups = progressByCategory(content.cards, study.data.progress);
    return {
      perDay: reviewsPerDay(logs, now, DAYS),
      retention: retention(logs, now, DAYS),
      accuracy: answerAccuracy(logs),
      groups,
      studied: groups.reduce((sum, g) => sum + g.studied, 0),
      total: groups.reduce((sum, g) => sum + g.total, 0),
    };
  }, [logs, study.data, content.status, content.cards]);

  return (
    <section className="space-y-8">
      <h1 className="text-xl font-bold">統計</h1>
      <LoadStatus content={content.status} study={study.status} error={content.error ?? study.error} />
      {stats && (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="今日の評価" value={`${stats.perDay.at(-1)?.count ?? 0}`} note="問" />
            <Tile label={`定着率（${DAYS}日）`} value={percent(stats.retention.rate)} note={`復習 ${stats.retention.reviews}回`} />
            <Tile label="選んだ答えの正解率" value={percent(stats.accuracy.rate)} note={`${stats.accuracy.graded}回`} />
            <Tile label="学習したカード" value={`${stats.studied}`} note={`/ ${stats.total}枚`} />
          </dl>
          <ReviewsChart perDay={stats.perDay} />
          <CategoryTable groups={stats.groups} />
          <p className="text-sm text-slate-500">
            定着率は、復習段階のカードを「もう一度」以外で評価した割合です。選んだ答えの正解率は評価には影響しません。
          </p>
        </>
      )}
    </section>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd>
        <span className="text-2xl font-bold">{value}</span>
        <span className="ml-1 text-sm text-slate-500">{note}</span>
      </dd>
    </div>
  );
}

function ReviewsChart({ perDay }: { perDay: { day: string; count: number }[] }) {
  const max = Math.max(1, ...perDay.map((d) => d.count));
  const [active, setActive] = useState<number | null>(null);
  const shown = active !== null ? perDay[active] : undefined;
  const label = (day: string) => day.slice(5).replace("-", "/");

  return (
    <section aria-labelledby="per-day">
      <div className="flex items-baseline justify-between">
        <h2 id="per-day" className="font-bold">1日の評価数（{DAYS}日間）</h2>
        <p className="text-sm text-slate-600" aria-live="polite">
          {shown ? `${label(shown.day)}：${shown.count}問` : `最大 ${max}問`}
        </p>
      </div>
      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="relative h-32 border-b border-slate-300" role="img" aria-label={`直近${DAYS}日の1日あたりの評価数。詳しくは下の表を参照。`}>
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {perDay.map((d, i) => (
              <div
                key={d.day}
                className="flex h-full flex-1 cursor-default items-end"
                title={`${label(d.day)}：${d.count}問`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onClick={() => setActive(active === i ? null : i)}
              >
                <div
                  className={`w-full rounded-t-[4px] ${active === i ? "bg-teal-900" : "bg-teal-600"}`}
                  style={{ height: d.count > 0 ? `${Math.max(2, (d.count / max) * 100)}%` : "0" }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{label(perDay[0]?.day ?? "")}</span>
          <span>今日</span>
        </div>
      </div>
      <details className="mt-2 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 text-teal-700">表で見る</summary>
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-600">
              <th className="font-normal">日付</th>
              <th className="text-right font-normal">評価数</th>
            </tr>
          </thead>
          <tbody>
            {[...perDay].reverse().map((d) => (
              <tr key={d.day} className="border-t border-slate-200">
                <td>{d.day}</td>
                <td className="text-right">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function CategoryTable({ groups }: { groups: ReturnType<typeof progressByCategory> }) {
  return (
    <section aria-labelledby="by-category">
      <h2 id="by-category" className="font-bold">分野別の進み具合</h2>
      <div className="mt-2 space-y-3">
        {groups.map((g) => {
          const studied = g.studied;
          return (
            <div key={`${g.deck}/${g.category}`} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3>
                  <span className="text-sm text-slate-500">{DECK_LABELS[g.deck]}</span> {g.category}
                </h3>
                <span className="text-sm">
                  {studied} / {g.total}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200" role="presentation">
                <div className="h-2 rounded-full bg-teal-600" style={{ width: `${(studied / g.total) * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                新規 {g.new}・学習中 {g.learning}・復習 {g.review}・保留中 {g.suspended}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
