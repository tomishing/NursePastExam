import { useEffect, useState } from "react";
import { imageUrl } from "../lib/card.ts";
import Icon from "./Icon.tsx";

type Props = { images: string[]; label: string };

/**
 * Figures and tables. Tap one to open it fitted to the screen; 原寸 shows it at full size,
 * where wide images (the 別冊 pages) scroll inside the viewer.
 */
export default function CardImages({ images, label }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [actualSize, setActualSize] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    // Keep the page behind the viewer from scrolling.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (images.length === 0) return null;

  const view = (name: string) => {
    setActualSize(false);
    setOpen(name);
  };

  return (
    <div className="mt-4 space-y-3">
      {images.map((name, i) => (
        <button
          key={name}
          type="button"
          onClick={() => view(name)}
          className="relative block w-full overflow-hidden rounded-xl border border-line bg-white p-1"
          aria-label={`${label} 図${images.length > 1 ? i + 1 : ""}を拡大`}
        >
          {/* Figures keep a white background in dark mode: they are scans of printed pages. */}
          <img
            src={imageUrl(name)}
            alt={`${label} 図${images.length > 1 ? i + 1 : ""}`}
            loading="lazy"
            decoding="async"
            className="mx-auto max-w-full"
          />
          <span className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-ink/70 text-white">
            <Icon name="zoom" className="size-4" />
          </span>
        </button>
      ))}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="図の拡大表示"
          className="fixed inset-0 z-50 flex flex-col bg-black/90 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
          onClick={() => setOpen(null)}
        >
          <div className="flex justify-end gap-2 p-2" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActualSize((a) => !a)}
              aria-pressed={actualSize}
              className="min-h-11 min-w-11 rounded-full bg-white/15 px-4 font-semibold text-white backdrop-blur"
            >
              {actualSize ? "画面に合わせる" : "原寸"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="min-h-11 min-w-11 rounded-full bg-white px-4 font-semibold text-ink"
              autoFocus
            >
              閉じる
            </button>
          </div>
          <div className={`min-h-0 flex-1 p-2 ${actualSize ? "overflow-auto" : "flex items-center justify-center"}`}>
            <img
              src={imageUrl(open)}
              alt={`${label} 拡大図`}
              className={actualSize ? "max-w-none bg-white" : "max-h-full max-w-full bg-white object-contain"}
              onClick={(event) => {
                event.stopPropagation();
                setActualSize((a) => !a);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
