type Props = {
  content: "idle" | "loading" | "ready" | "missing" | "error";
  study: "idle" | "loading" | "ready" | "error";
  error: string | null;
};

/** Loading and error messages shared by pages that need cards and progress. Renders nothing when ready. */
export default function LoadStatus({ content, study, error }: Props) {
  if (content === "missing") {
    return (
      <p className="mt-4 rounded-2xl bg-warn-soft p-4 text-warn-ink">
        問題データがありません。<code>npm run import</code> を実行してください。
      </p>
    );
  }
  if (content === "error" || study === "error") {
    return (
      <p className="mt-4 rounded-2xl bg-bad-soft p-4 text-bad-ink">読み込みに失敗しました：{error}</p>
    );
  }
  if (content !== "ready" || study !== "ready") {
    return (
      <div className="mt-4 space-y-3" aria-busy="true">
        <p className="sr-only">読み込み中…</p>
        <div className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-12 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }
  return null;
}
