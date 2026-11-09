import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import CardBack from "../components/CardBack.tsx";
import CardFront from "../components/CardFront.tsx";
import Icon from "../components/Icon.tsx";
import LoadStatus from "../components/LoadStatus.tsx";
import PageHeader from "../components/PageHeader.tsx";
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

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable);
}

export default function Review() {
  const content = useContentStore();
  const study = useStudyStore();
  const { data, filter } = study;

  // The revealed card is tracked by ID, so a newly loaded card always starts on its front,
  // even in the render between saving a rating and showFront() running.
  const [revealedId, setRevealedId] = useState<string | null>(null);
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
    setRevealedId(null);
    setSelected([]);
    top.current?.scrollIntoView?.({ block: "start" });
  };

  const revealed = card !== undefined && revealedId === card.id;

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
        setRevealedId(card.id);
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
  const remaining = counts ? counts.new + counts.learning + counts.review : 0;
  const progress = session.length + remaining > 0 ? session.length / (session.length + remaining) : 0;

  return (
    <section>
      <div ref={top} className="scroll-mt-4">
        <PageHeader title="学習">
          {queue && card && (
            <>
              <button type="button" className="btn btn-ghost px-3 text-sm" onClick={() => void undo()} disabled={busy}>
                <Icon name="undo" className="size-4" />
                元に戻す
              </button>
              <button type="button" className="btn btn-ghost px-3 text-sm" onClick={() => void suspend()} disabled={busy}>
                <Icon name="pause" className="size-4" />
                保留
              </button>
            </>
          )}
        </PageHeader>
        {counts && (
          <div className="mt-3">
            <p className="flex flex-wrap gap-1.5 text-xs font-semibold tabular-nums" aria-label="残り">
              <span className="rounded-full bg-info-soft px-2.5 py-1 text-info-ink">新規 {counts.new}</span>
              <span className="rounded-full bg-bad-soft px-2.5 py-1 text-bad-ink">学習中 {counts.learning}</span>
              <span className="rounded-full bg-good-soft px-2.5 py-1 text-good-ink">復習 {counts.review}</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted" role="presentation">
              <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      <LoadStatus content={content.status} study={study.status} error={content.error ?? study.error} />

      {notice && (
        <div role="status" className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-surface-muted py-2 pr-2 pl-4 text-sm">
          <span>{notice.text}</span>
          {notice.suspended && (
            <button type="button" className="btn btn-secondary text-sm" disabled={busy} onClick={() => void unsuspend(notice.suspended!)}>
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

          {/* Kept above the tab bar so the next action never needs a scroll on a phone. */}
          <div className="sticky bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-20 mt-4 rounded-2xl border border-line bg-surface p-2 shadow-[0_-4px_16px_rgb(42_38_34/0.06)]">
            {revealed && intervals ? (
              <>
                {result !== undefined && (
                  <p className={`mb-2 text-center text-sm font-bold ${result ? "text-good-ink" : "text-bad-ink"}`}>
                    選んだ答え：{result ? "正解" : "不正解"}
                    <span className="ml-2 text-xs font-normal text-ink-3">（評価は思い出せたかで選んでください）</span>
                  </p>
                )}
                <RatingButtons intervals={intervals} onRate={(r) => void rate(r)} disabled={busy} />
              </>
            ) : (
              <button type="button" className="btn btn-primary min-h-13 w-full text-lg" onClick={() => card && setRevealedId(card.id)}>
                答えを見る
              </button>
            )}
          </div>
        </>
      )}

      {queue && !card && (
        <div className="card mt-6 p-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <Icon name="check" className="size-7" />
          </div>
          <h2 className="mt-3 text-xl font-bold">{session.length > 0 ? "おつかれさまでした" : "出題する問題はありません"}</h2>
          {session.length > 0 && (
            <dl className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-2">
              <div className="rounded-2xl bg-surface-muted p-3">
                <dt className="text-xs text-ink-3">評価した問題</dt>
                <dd className="text-2xl font-bold tabular-nums">{session.length}問</dd>
              </div>
              {graded.length > 0 && (
                <div className="rounded-2xl bg-surface-muted p-3">
                  <dt className="text-xs text-ink-3">選んだ答えの正解</dt>
                  <dd className="text-2xl font-bold tabular-nums">
                    {graded.filter((e) => e.correct).length} / {graded.length}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {queue.laterToday > 0 && (
            <p className="mt-4 text-sm text-ink-2">学習中の問題があと{queue.laterToday}問、今日中に出題されます。</p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to="/" className="btn btn-primary">
              ホームへ
            </Link>
            {queue.laterToday > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => void study.refresh()}>
                もう一度確認
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => void undo()} disabled={busy}>
              元に戻す
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
