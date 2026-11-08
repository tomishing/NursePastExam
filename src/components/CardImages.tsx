import { useEffect, useState } from "react";
import { imageUrl } from "../lib/card.ts";

type Props = { images: string[]; label: string };

/** Figures and tables. Tap one to see it at full size; wide images scroll inside the viewer. */
export default function CardImages({ images, label }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (images.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {images.map((name, i) => (
        <button
          key={name}
          type="button"
          onClick={() => setOpen(name)}
          className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-1"
          aria-label={`${label} 図${images.length > 1 ? i + 1 : ""}を拡大`}
        >
          <img src={imageUrl(name)} alt={`${label} 図${images.length > 1 ? i + 1 : ""}`} loading="lazy" className="mx-auto max-w-full" />
        </button>
      ))}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="図の拡大表示"
          className="fixed inset-0 z-50 flex flex-col bg-black/85 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          onClick={() => setOpen(null)}
        >
          <div className="flex justify-end p-2">
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="min-h-11 min-w-11 rounded-lg bg-white/90 px-4 text-slate-900"
              autoFocus
            >
              閉じる
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <img
              src={imageUrl(open)}
              alt={`${label} 拡大図`}
              className="max-w-none bg-white"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
