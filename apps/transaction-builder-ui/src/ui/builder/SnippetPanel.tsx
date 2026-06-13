import {
  generateViemSnippet,
  generateWagmiSnippet,
  validateDraft,
} from "@transaction-builder/domain";
import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import type { BuilderDraft } from "./builderState";

type SnippetTab = "viem" | "wagmi";

export function SnippetPanel({ draft }: { draft: BuilderDraft }) {
  const [tab, setTab] = useState<SnippetTab>("viem");
  const [copied, setCopied] = useState(false);
  const snippets = useMemo(() => {
    const validation = validateDraft(draft);
    if (!validation.success) {
      return {
        ok: false as const,
        message: "Complete the Action Definition to generate snippets.",
      };
    }

    return {
      ok: true as const,
      viem: generateViemSnippet(validation.definition),
      wagmi: generateWagmiSnippet(validation.definition),
    };
  }, [draft]);

  const currentSnippet =
    snippets.ok && tab === "viem"
      ? snippets.viem
      : snippets.ok
        ? snippets.wagmi
        : "";

  const handleCopy = async () => {
    if (!currentSnippet) return;
    await navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
      <div className="daisy-card-body gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Code Snippets</h2>
          <button
            className="daisy-btn daisy-btn-sm"
            disabled={!snippets.ok}
            onClick={handleCopy}
            type="button"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            Copy
          </button>
        </div>
        <div className="daisy-tabs daisy-tabs-box">
          <button
            className={`daisy-tab ${tab === "viem" ? "daisy-tab-active" : ""}`}
            onClick={() => setTab("viem")}
            type="button"
          >
            Viem
          </button>
          <button
            className={`daisy-tab ${tab === "wagmi" ? "daisy-tab-active" : ""}`}
            onClick={() => setTab("wagmi")}
            type="button"
          >
            Wagmi
          </button>
        </div>
        {snippets.ok ? (
          <pre className="max-h-[460px] overflow-auto rounded-lg bg-neutral p-4 text-xs text-white">
            <code>{currentSnippet}</code>
          </pre>
        ) : (
          <div className="rounded-lg bg-base-200 p-4 text-sm text-base-content/70">
            {snippets.message}
          </div>
        )}
      </div>
    </section>
  );
}
