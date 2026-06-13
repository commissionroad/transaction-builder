import {
  generateViemSnippet,
  generateWagmiSnippet,
  validateDraft,
} from "@transaction-builder/domain";
import classNames from "classnames";
import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import prismTheme from "src/ui/base/prismTheme";
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
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Code Snippets</h2>
        <button
          className="daisy-btn daisy-btn-sm"
          disabled={!snippets.ok}
          onClick={handleCopy}
          type="button"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          Copy
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 bg-base-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-full bg-[#ff5f57]"
            />
            <span
              aria-hidden="true"
              className="size-3 rounded-full bg-[#ffbd2e]"
            />
            <span
              aria-hidden="true"
              className="size-3 rounded-full bg-[#28c840]"
            />
            <span className="ml-2 font-mono text-sm font-bold text-base-content/50">
              {tab === "viem" ? "commissionAction.ts" : "ActionButton.tsx"}
            </span>
          </div>
          <div
            aria-label="Snippet library"
            className="daisy-tabs daisy-tabs-box daisy-tabs-sm"
            role="tablist"
          >
            <button
              className={classNames("daisy-tab rounded daisy-btn", {
                "daisy-tab-active [--daisy-tab-bg:var(--color-primary)]":
                  tab === "viem",
              })}
              onClick={() => setTab("viem")}
              role="tab"
              type="button"
            >
              Viem
            </button>
            <button
              className={classNames("daisy-tab rounded daisy-btn", {
                "daisy-tab-active [--daisy-tab-bg:var(--color-primary)]":
                  tab === "wagmi",
              })}
              onClick={() => setTab("wagmi")}
              role="tab"
              type="button"
            >
              Wagmi
            </button>
          </div>
        </div>
        {snippets.ok ? (
          <div className="max-h-[520px] overflow-auto bg-white">
            <SyntaxHighlighter
              codeTagProps={{
                style: {
                  fontFamily:
                    '"Fira Code", "Fira Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace',
                },
              }}
              customStyle={{
                background: "#FFFFFF",
                fontSize: 13,
                lineHeight: 1.55,
                margin: 0,
                padding: "1rem",
              }}
              language="typescript"
              style={prismTheme}
            >
              {currentSnippet}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div className="bg-base-200 p-4 text-sm text-base-content/70">
            {snippets.message}
          </div>
        )}
      </div>
    </section>
  );
}
