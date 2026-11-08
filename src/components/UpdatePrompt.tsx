import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Registers the service worker (offline use) and offers a new version when one is ready.
 * The update waits for the user so a review is never interrupted by a reload.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  // The offline notice is informational, so it goes away by itself. An update waits for the user.
  useEffect(() => {
    if (!offlineReady || needRefresh) return;
    const timer = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(timer);
  }, [offlineReady, needRefresh, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
    <div role="status" className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-lg bg-slate-800 p-2 pl-3 text-sm text-white shadow-lg">
      <p className="flex-1">{needRefresh ? "新しいバージョンがあります。" : "オフラインでも学習できるようになりました。"}</p>
      {needRefresh && (
        <button type="button" onClick={() => void updateServiceWorker(true)} className="min-h-11 rounded-lg bg-teal-500 px-4 font-bold text-slate-900">
          更新
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
        className="min-h-11 rounded-lg px-3 text-slate-200"
      >
        閉じる
      </button>
    </div>
    </div>
  );
}
