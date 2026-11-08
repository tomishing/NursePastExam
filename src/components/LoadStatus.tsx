type Props = {
  content: "idle" | "loading" | "ready" | "missing" | "error";
  study: "idle" | "loading" | "ready" | "error";
  error: string | null;
};

/** Loading and error messages shared by pages that need cards and progress. Renders nothing when ready. */
export default function LoadStatus({ content, study, error }: Props) {
  if (content === "missing") {
    return (
      <p className="mt-4 rounded-lg bg-amber-50 p-3 text-amber-900">
        問題データがありません。<code>npm run import</code> を実行してください。
      </p>
    );
  }
  if (content === "error" || study === "error") {
    return <p className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-900">読み込みに失敗しました：{error}</p>;
  }
  if (content !== "ready" || study !== "ready") return <p className="mt-4 text-slate-600">読み込み中…</p>;
  return null;
}
