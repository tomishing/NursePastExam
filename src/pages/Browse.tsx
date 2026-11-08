import { useEffect, useMemo, useState, type FormEvent } from "react";
import CardBack from "../components/CardBack.tsx";
import CardFront from "../components/CardFront.tsx";
import DeckFilter from "../components/DeckFilter.tsx";
import { selectionSize, toggleChoice } from "../lib/card.ts";
import { ALL_CARDS, filterCards, type CardFilter } from "../lib/filter.ts";
import { useContentStore } from "../store/content.ts";

const buttonClass = "min-h-11 rounded-lg border border-slate-300 bg-white px-4 disabled:opacity-40";

// Phase 3: step through cards with filters. Search and suspended cards come in Phase 6.
export default function Browse() {
  const { status, cards, error, load } = useContentStore();
  const [filter, setFilter] = useState<CardFilter>(ALL_CARDS);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [idQuery, setIdQuery] = useState("");
  const [idError, setIdError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => filterCards(cards, filter), [cards, filter]);
  const card = visible[Math.min(index, visible.length - 1)];

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(next, visible.length - 1)));
    setRevealed(false);
    setSelected([]);
  };

  const changeFilter = (next: CardFilter) => {
    setFilter(next);
    setIndex(0);
    setRevealed(false);
    setSelected([]);
  };

  const findById = (event: FormEvent) => {
    event.preventDefault();
    const id = idQuery.trim();
    const target = cards.find((c) => c.id === id);
    if (!target) {
      setIdError(`${id} は見つかりません`);
      return;
    }
    setIdError(null);
    const all = filterCards(cards, ALL_CARDS);
    setFilter(ALL_CARDS);
    setIndex(all.indexOf(target));
    setRevealed(false);
    setSelected([]);
  };

  return (
    <section>
      <h1 className="text-xl font-bold">一覧</h1>

      {status === "loading" || status === "idle" ? <p className="mt-4 text-slate-600">読み込み中…</p> : null}
      {status === "missing" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-amber-900">
          問題データがありません。<code>npm run import</code> を実行してください。
        </p>
      )}
      {status === "error" && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-900">読み込みに失敗しました：{error}</p>}

      {status === "ready" && (
        <>
          <div className="mt-4 space-y-3">
            <DeckFilter cards={cards} value={filter} onChange={changeFilter} />
            <form onSubmit={findById} className="flex gap-2">
              <label className="sr-only" htmlFor="card-id">
                問題ID
              </label>
              <input
                id="card-id"
                value={idQuery}
                onChange={(e) => setIdQuery(e.target.value)}
                placeholder="問題ID（例：ph-98-PM-38）"
                className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button type="submit" className={buttonClass}>
                表示
              </button>
            </form>
            {idError && <p className="text-sm text-rose-700">{idError}</p>}
          </div>

          {card ? (
            <>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button type="button" className={buttonClass} onClick={() => goTo(index - 1)} disabled={index === 0}>
                  前へ
                </button>
                <span className="text-sm text-slate-600" aria-live="polite">
                  {index + 1} / {visible.length}
                  <span className="ml-2 text-xs text-slate-400">{card.id}</span>
                </span>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => goTo(index + 1)}
                  disabled={index >= visible.length - 1}
                >
                  次へ
                </button>
              </div>

              <div className="mt-4">
                {revealed ? (
                  <CardBack card={card} selected={selected} />
                ) : (
                  <CardFront
                    card={card}
                    selected={selected}
                    onSelect={(n) => setSelected((current) => toggleChoice(current, n, selectionSize(card)))}
                  />
                )}
              </div>

              <button
                type="button"
                className="mt-6 min-h-11 w-full rounded-lg bg-teal-700 px-4 font-bold text-white"
                onClick={() => setRevealed((r) => !r)}
              >
                {revealed ? "問題に戻る" : "答えを見る"}
              </button>
            </>
          ) : (
            <p className="mt-4 text-slate-600">条件に合う問題がありません。</p>
          )}
        </>
      )}
    </section>
  );
}
