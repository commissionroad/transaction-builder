import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

export interface PrototypeVariant {
  key: string;
  name: string;
}

export function PrototypeSwitcher({
  current,
  onChange,
  variants,
}: {
  current: string;
  onChange: (variant: string) => void;
  variants: PrototypeVariant[];
}) {
  const currentIndex = Math.max(
    variants.findIndex((variant) => variant.key === current),
    0,
  );
  const currentVariant = variants[currentIndex] ?? variants[0];

  const move = (direction: -1 | 1) => {
    const nextIndex =
      (currentIndex + direction + variants.length) % variants.length;
    onChange(variants[nextIndex]?.key ?? variants[0].key);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryElement(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (import.meta.env.PROD || !currentVariant) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full border border-neutral/20 bg-neutral px-2 py-2 text-white shadow-2xl">
        <button
          aria-label="Previous prototype variant"
          className="daisy-btn daisy-btn-circle daisy-btn-sm border-white/10 bg-white/10 text-white hover:bg-white/20"
          onClick={() => move(-1)}
          type="button"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-64 px-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
            Prototype
          </div>
          <div className="text-sm font-semibold">
            {currentVariant.key} - {currentVariant.name}
          </div>
        </div>
        <button
          aria-label="Next prototype variant"
          className="daisy-btn daisy-btn-circle daisy-btn-sm border-white/10 bg-white/10 text-white hover:bg-white/20"
          onClick={() => move(1)}
          type="button"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}
