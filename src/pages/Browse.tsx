import { useEffect, useMemo, useState } from "react";
import CardBack from "../components/CardBack.tsx";
import CardFront from "../components/CardFront.tsx";
import DeckFilter from "../components/DeckFilter.tsx";
import LoadStatus from "../components/LoadStatus.tsx";
import { cardLabel, selectionSize, toggleChoice } from "../lib/card.ts";
import { ALL_CARDS, filterCards, type CardFilter } from "../lib/filter.ts";
import { matchesSearch } from "../lib/search.ts";
import { cardStatus, STATUS_LABELS, type CardStatus } from "../lib/stats.ts";
import { useContentStore } from "../store/content.ts";
import { useStudyStore } from "../store/study.ts";

const PAGE = 50;
const button = "min-h-11 rounded-lg border border-slate-300 bg-white px-4 disabled:opacity-40";
const STATUS_TONES: Record<CardStatus, string> = {
  new: "bg-sky-100 text-sky-900",
  learning: "bg-rose-100 text-rose-900",
  review: "bg-emerald-100 text-emerald-900",
  suspended: "bg-slate-200 text-slate-800",
};

// Search and filter all cards (including suspended and no-answer cards), view one, and suspend or restore it.
export default function Browse() {
  const content = useContentStore();
  const study = useStudyStore();
  const progress = study.data?.progress;

  const [filter, setFilter] = useState<CardFilter>(ALL_CARDS);
  const [status, setStatus] = useState<CardStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  // The open card is tracked by ID: suspending or restoring it can remove it from the
  // filtered results, and it should stay open when that happens.
  const [openId, setOpenId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void content.load();
    void study.refresh();
  }, [content.load, study.refresh]);

  const results = useMemo(() => {
    if (!progress) return [];
    return filterCards(content.cards, filter).filter(
      (card) => (status === "all" || cardStatus(progress.get(card.id)) === status) && matchesSearch(card, query),
    );
  }, [content.cards, filter, status, query, progress]);

  const card = openId ? content.cards.find((c) => c.id === openId) : undefined;
  const index = card ? results.indexOf(card) : -1; // -1 when the card no longer matches the filters
  const cardState = card && progress ? cardStatus(progress.get(card.id)) : undefined;

  const changeFilters = (apply: () => void) => {
    apply();
    setLimit(PAGE);
    setOpenId(null);
  };
  const open = (i: number) => {
    const target = results[i];
    if (!target) return;
    setOpenId(target.id);
    setRevealed(false);
    setSelected([]);
    window.scrollTo?.({ top: 0 });
  };

  const toggleSuspended = async () => {
    if (!card) return;
    setBusy(true);
    try {
      await study.setSuspended(card, cardState !== "suspended");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h1 className="text-xl font-bold">一覧</h1>
      <LoadStatus content={content.status} study={study.status} error={content.error ?? study.error} />

      {progress && card && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" className={button} onClick={() => setOpenId(null)}>
              一覧に戻る
            </button>
            <span className="text-sm text-slate-600" aria-live="polite">
              {index >= 0 ? `${index + 1} / ${results.length}` : "絞り込み条件の対象外"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {cardState && <span className={`rounded px-2 py-1 text-sm ${STATUS_TONES[cardState]}`}>{STATUS_LABELS[cardState]}</span>}
            <span className="text-xs text-slate-400">{card.id}</span>
            <button type="button" className={`${button} ml-auto`} onClick={() => void toggleSuspended()} disabled={busy}>
              {cardState === "suspended" ? "保留を解除" : "保留にする"}
            </button>
          </div>

          <div className="mt-4">
            {revealed ? (
              <CardBack card={card} selected={selected} />
            ) : (
              <CardFront card={card} selected={selected} onSelect={(n) => setSelected((s) => toggleChoice(s, n, selectionSize(card)))} />
            )}
          </div>

          <button
            type="button"
            className="mt-6 min-h-11 w-full rounded-lg bg-teal-700 px-4 font-bold text-white"
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? "問題に戻る" : "答えを見る"}
          </button>
          <div className="mt-3 flex justify-between gap-2">
            <button type="button" className={button} onClick={() => open(index - 1)} disabled={index <= 0}>
              前へ
            </button>
            <button type="button" className={button} onClick={() => open(index + 1)} disabled={index < 0 || index >= results.length - 1}>
              次へ
            </button>
          </div>
        </div>
      )}

      {progress && !card && (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="sr-only">検索</span>
            <input
              type="search"
              value={query}
              onChange={(e) => changeFilters(() => setQuery(e.target.value))}
              placeholder="キーワードや問題ID（例：結核、ph-98-PM-38）"
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <DeckFilter cards={content.cards} value={filter} onChange={(f) => changeFilters(() => setFilter(f))} />
          <label className="block text-sm text-slate-600">
            状態
            <select
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2"
              value={status}
              onChange={(e) => changeFilters(() => setStatus(e.target.value as CardStatus | "all"))}
            >
              <option value="all">すべて</option>
              {(Object.keys(STATUS_LABELS) as CardStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <p className="text-sm text-slate-600" aria-live="polite">
            {results.length}件
          </p>
          <ul className="space-y-2">
            {results.slice(0, limit).map((c, i) => {
              const s = cardStatus(progress.get(c.id));
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => open(i)}
                    className="block min-h-11 w-full rounded-lg border border-slate-200 bg-white p-3 text-left"
                  >
                    <span className="flex items-center justify-between gap-2 text-sm text-slate-500">
                      <span>
                        {cardLabel(c)} {c.category}
                      </span>
                      <span className={`shrink-0 rounded px-2 text-xs ${STATUS_TONES[s]}`}>{STATUS_LABELS[s]}</span>
                    </span>
                    <span className="mt-1 line-clamp-2">{c.question}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {results.length > limit && (
            <button type="button" className={`${button} w-full`} onClick={() => setLimit((l) => l + PAGE)}>
              さらに表示（残り {results.length - limit}件）
            </button>
          )}
        </div>
      )}
    </section>
  );
}
