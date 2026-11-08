import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import CardBack from "../components/CardBack.tsx";
import CardFront from "../components/CardFront.tsx";
import LoadStatus from "../components/LoadStatus.tsx";
import RatingButtons from "../components/RatingButtons.tsx";
import { grade, selectionSize, toggleChoice } from "../lib/card.ts";
import { filterCards } from "../lib/filter.ts";
import { formatInterval, previewDue } from "../scheduler/fsrs.ts";
import { buildQueue, nextCard, queueCounts } from "../scheduler/queue.ts";
import { useContentStore } from "../store/content.ts";
import { useStudyStore } from "../store/study.ts";
import type { Card } from "../types/card.ts";
import type { Rating } from "../types/progress.ts";

type SessionEntry = { cardId: string; correct?: boolean };

const smallButton = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-40";

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable);
}

export default function Review() {
  const content = useContentStore();
  const study = useStudyStore();
  const { data, filter } = study;

  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [returnedId, setReturnedId] = useState<string | null>(null); // card brought back by undo
  const [session, setSession] = useState<SessionEntry[]>([]);
  const [notice, setNotice] = useState<{ text: string; suspended?: Card } | null>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void content.load();
    void study.refresh();
  }, [content.load, study.refresh]);

  const queue = useMemo(() => {
    if (content.status !== "ready" || !data) return null;
    return buildQueue(filterCards(content.cards, filter), data.progress, data.logs, data.settings, data.loadedAt);
  }, [content.status, content.cards, data, filter]);

  const card = useMemo(() => {
    if (!queue) return undefined;
    return (returnedId ? content.cards.find((c) => c.id === returnedId) : undefined) ?? nextCard(queue);
  }, [queue, returnedId, content.cards]);

  // Start each card from the front, at the top of the page. Called after every action,
  // because the next card can be the same card again (e.g. the last learning card).
  const showFront = () => {
    setRevealed(false);
    setSelected([]);
    top.current?.scrollIntoView?.({ block: "start" });
  };

  const intervals = useMemo(() => {
    if (!card || !data || !revealed) return null;
    const now = new Date();
    const due = previewDue(data.progress.get(card.id)?.fsrs, now, data.settings.desiredRetention);
    return Object.fromEntries(([1, 2, 3, 4] as const).map((r) => [r, formatInterval(now, due[r])])) as Record<Rating, string>;
  }, [card, data, revealed]);

  const result = card && revealed ? grade(card, selected) : undefined;

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return;
      setBusy(true);
      try {
        await study.rate(card, rating, { selected, correct: result });
        setSession((s) => [...s, { cardId: card.id, correct: result }]);
        setReturnedId(null);
        setNotice(null);
        showFront();
      } finally {
        setBusy(false);
      }
    },
    [card, busy, study, selected, result],
  );

  const undo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const cardId = await study.undo();
      if (!cardId) {
        setNotice({ text: "取り消せる評価がありません。" });
        return;
      }
      setSession((s) => (s.at(-1)?.cardId === cardId ? s.slice(0, -1) : s));
      setReturnedId(cardId);
      setNotice({ text: "直前の評価を取り消しました。" });
      showFront();
    } finally {
      setBusy(false);
    }
  };

  const suspend = async () => {
    if (!card || busy) return;
    setBusy(true);
    try {
      await study.setSuspended(card, true);
      setReturnedId(null);
      setNotice({ text: "この問題を保留しました。", suspended: card });
      showFront();
    } finally {
      setBusy(false);
    }
  };

  const unsuspend = async (target: Card) => {
    setBusy(true);
    try {
      await study.setSuspended(target, false);
      setReturnedId(target.id);
      setNotice(null);
      showFront();
    } finally {
      setBusy(false);
    }
  };

  // Keyboard: Space reveals, 1-4 rate. Every action also has a button.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey || !card) return;
      if (event.key === " " && !revealed) {
        event.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        void rate(Number(event.key) as Rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, revealed, rate]);

  const counts = queue ? queueCounts(queue) : null;
  const graded = session.filter((e) => e.correct !== undefined);

  return (
    <section>
      <div ref={top} className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">学習</h1>
        {counts && (
          <p className="text-sm" aria-label="残り">
            <span className="text-sky-700">新規 {counts.new}</span>
            <span className="ml-2 text-rose-700">学習中 {counts.learning}</span>
            <span className="ml-2 text-emerald-700">復習 {counts.review}</span>
          </p>
        )}
      </div>

      <LoadStatus content={content.status} study={study.status} error={content.error ?? study.error} />

      {notice && (
        <div role="status" className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-slate-100 p-2 text-sm">
          <span>{notice.text}</span>
          {notice.suspended && (
            <button type="button" className={smallButton} disabled={busy} onClick={() => void unsuspend(notice.suspended!)}>
              保留を取り消す
            </button>
          )}
        </div>
      )}

      {queue && card && (
        <>
          <div className="mt-4">
            {revealed ? (
              <CardBack card={card} selected={selected} showResult={false} />
            ) : (
              <CardFront
                card={card}
                selected={selected}
                onSelect={(n) => setSelected((current) => toggleChoice(current, n, selectionSize(card)))}
              />
            )}
          </div>

          <div className="mt-6 space-y-3">
            {revealed && intervals ? (
              <>
                {result !== undefined && (
                  <p className={`text-center font-bold ${result ? "text-emerald-700" : "text-rose-700"}`}>
                    選んだ答え：{result ? "正解" : "不正解"}
                    <span className="ml-2 text-xs font-normal text-slate-500">（評価は思い出せたかで選んでください）</span>
                  </p>
                )}
                <RatingButtons intervals={intervals} onRate={(r) => void rate(r)} disabled={busy} />
              </>
            ) : (
              <button
                type="button"
                className="min-h-12 w-full rounded-lg bg-teal-700 px-4 font-bold text-white"
                onClick={() => setRevealed(true)}
              >
                答えを見る
              </button>
            )}
            <div className="flex justify-between gap-2">
              <button type="button" className={smallButton} onClick={() => void undo()} disabled={busy}>
                元に戻す
              </button>
              <button type="button" className={smallButton} onClick={() => void suspend()} disabled={busy}>
                保留
              </button>
            </div>
          </div>
        </>
      )}

      {queue && !card && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold">{session.length > 0 ? "おつかれさまでした" : "出題する問題はありません"}</h2>
          {session.length > 0 && (
            <dl className="mt-3 space-y-1">
              <div className="flex justify-between">
                <dt className="text-slate-600">評価した問題</dt>
                <dd className="font-bold">{session.length}問</dd>
              </div>
              {graded.length > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">選んだ答えの正解</dt>
                  <dd className="font-bold">
                    {graded.filter((e) => e.correct).length} / {graded.length}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {queue.laterToday > 0 && (
            <p className="mt-3 text-sm text-slate-600">あと{queue.laterToday}枚の学習中カードが今日中に出題されます。</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/" className="flex min-h-11 items-center rounded-lg bg-teal-700 px-4 font-bold text-white">
              ホームへ
            </Link>
            {queue.laterToday > 0 && (
              <button type="button" className={smallButton} onClick={() => void study.refresh()}>
                もう一度確認
              </button>
            )}
            <button type="button" className={smallButton} onClick={() => void undo()} disabled={busy}>
              元に戻す
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
