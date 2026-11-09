import { useEffect, useMemo, useState } from "react";
import CardBack from "../components/CardBack.tsx";
import CardFront from "../components/CardFront.tsx";
import DeckFilter from "../components/DeckFilter.tsx";
import Icon from "../components/Icon.tsx";
import LoadStatus from "../components/LoadStatus.tsx";
import PageHeader from "../components/PageHeader.tsx";
import { cardLabel, selectionSize, toggleChoice } from "../lib/card.ts";
import { ALL_CARDS, filterCards, type CardFilter } from "../lib/filter.ts";
import { matchesSearch } from "../lib/search.ts";
import { cardStatus, STATUS_LABELS, type CardStatus } from "../lib/stats.ts";
import { useContentStore } from "../store/content.ts";
import { useStudyStore } from "../store/study.ts";

const PAGE = 50;
const STATUS_TONES: Record<CardStatus, string> = {
  new: "bg-info-soft text-info-ink",
  learning: "bg-bad-soft text-bad-ink",
  review: "bg-good-soft text-good-ink",
  suspended: "bg-surface-muted text-ink-2",
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

  const filtered =
    filter.deck !== "all" || filter.category !== "all" || filter.yearFrom !== null || filter.yearTo !== null || status !== "all";
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
      <PageHeader title="一覧" />
      <LoadStatus content={content.status} study={study.status} error={content.error ?? study.error} />

      {progress && card && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="btn btn-ghost -ml-2 px-2" onClick={() => setOpenId(null)}>
              <Icon name="left" />
              一覧に戻る
            </button>
            <span className="text-sm text-ink-3 tabular-nums" aria-live="polite">
              {index >= 0 ? `${index + 1} / ${results.length}` : "絞り込み条件の対象外"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {cardState && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONES[cardState]}`}>{STATUS_LABELS[cardState]}</span>
            )}
            <span className="font-mono text-xs text-ink-3">{card.id}</span>
            <button type="button" className="btn btn-secondary ml-auto text-sm" onClick={() => void toggleSuspended()} disabled={busy}>
              <Icon name={cardState === "suspended" ? "play" : "pause"} className="size-4" />
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

          <div className="sticky bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-20 mt-4 flex gap-2 rounded-2xl border border-line bg-surface p-2 shadow-[0_-4px_16px_rgb(42_38_34/0.06)]">
            <button type="button" className="btn btn-secondary px-3" onClick={() => open(index - 1)} disabled={index <= 0} aria-label="前へ">
              <Icon name="left" />
            </button>
            <button type="button" className="btn btn-primary flex-1" onClick={() => setRevealed((r) => !r)}>
              {revealed ? "問題に戻る" : "答えを見る"}
            </button>
            <button
              type="button"
              className="btn btn-secondary px-3"
              onClick={() => open(index + 1)}
              disabled={index < 0 || index >= results.length - 1}
              aria-label="次へ"
            >
              <Icon name="right" />
            </button>
          </div>
        </div>
      )}

      {progress && !card && (
        <div className="mt-4 space-y-4">
          <label className="relative block">
            <span className="sr-only">検索</span>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={query}
              onChange={(e) => changeFilters(() => setQuery(e.target.value))}
              placeholder="キーワードや問題ID（例：結核、ph-98-PM-38）"
              className="field min-h-12 rounded-2xl pl-11"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>

          <details className="card group p-4">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between font-bold">
              <span className="flex items-center gap-2">
                絞り込み
                {filtered && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-ink">条件あり</span>}
              </span>
              <Icon name="right" className="size-4 text-ink-3 transition-transform group-open:rotate-90" />
            </summary>
            <div className="mt-3 space-y-3">
              <DeckFilter cards={content.cards} value={filter} onChange={(f) => changeFilters(() => setFilter(f))} />
              <label className="block">
                <span className="field-label">状態</span>
                <select
                  className="field"
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
            </div>
          </details>

          <p className="px-1 text-sm font-medium text-ink-2 tabular-nums" aria-live="polite">
            {results.length}件
          </p>
          <ul className="card divide-y divide-line overflow-hidden">
            {results.slice(0, limit).map((c, i) => {
              const s = cardStatus(progress.get(c.id));
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => open(i)}
                    className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-xs text-ink-3">
                        <span className="palt truncate">
                          {cardLabel(c)}・{c.category}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${STATUS_TONES[s]}`}>{STATUS_LABELS[s]}</span>
                      </span>
                      <span className="mt-1 line-clamp-2 leading-relaxed">{c.question}</span>
                    </span>
                    <Icon name="right" className="size-4 shrink-0 text-ink-3" />
                  </button>
                </li>
              );
            })}
          </ul>
          {results.length > limit && (
            <button type="button" className="btn btn-secondary w-full" onClick={() => setLimit((l) => l + PAGE)}>
              さらに表示（残り {results.length - limit}件）
            </button>
          )}
        </div>
      )}
    </section>
  );
}
