import { validateDraft } from "@transaction-builder/domain";
import { Check, Copy, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createPublishedAction } from "src/network/apiClient";
import {
  isAllowlistBlocking,
  isAllowlistPending,
  type AllowlistStatus,
} from "src/ui/allowlist/useAllowlistStatus";
import type { BuilderDraft } from "./builderState";

interface ShareActionPanelProps {
  allowlistStatus: AllowlistStatus;
  draft: BuilderDraft;
  hasActionSteps: boolean;
}

export function ShareActionPanel({
  allowlistStatus,
  draft,
  hasActionSteps,
}: ShareActionPanelProps) {
  const [status, setStatus] = useState<"idle" | "publishing" | "published">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const nftIssue = !draft.commissionRoadNftId
    ? "Select a CommissionRoad NFT before sharing."
    : undefined;
  const allowlistIssue = isAllowlistBlocking(allowlistStatus)
    ? "Action targets must be allowlisted before sharing."
    : isAllowlistPending(allowlistStatus)
      ? "Wait for the selected NFT allowlist check to finish."
      : undefined;
  const canShare =
    validation.success &&
    hasActionSteps &&
    !nftIssue &&
    !allowlistIssue &&
    status !== "publishing";
  const sharePath = slug ? `/t/${slug}` : null;
  const shareUrl = sharePath ? getShareUrl(sharePath) : null;

  const handleShare = async () => {
    if (!validation.success || !canShare) {
      return;
    }

    setStatus("publishing");
    setError(null);
    try {
      const published = await createPublishedAction(validation.definition);
      setSlug(published.slug);
      setStatus("published");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to publish Action",
      );
      setStatus("idle");
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) {
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="daisy-card border border-base-300 bg-base-100 shadow-sm">
      <div className="daisy-card-body gap-4">
        <h2 className="text-lg font-semibold">Share</h2>
        <p className="text-sm text-base-content/70">
          Share Action creates an immutable Published Action and returns a short
          `/t/` link.
        </p>
        <button
          className="daisy-btn daisy-btn-primary w-full"
          disabled={!canShare}
          onClick={handleShare}
          type="button"
        >
          {status === "publishing" ? (
            <span className="daisy-loading daisy-loading-spinner daisy-loading-sm" />
          ) : (
            <Share2 className="size-4" />
          )}
          Share Action
        </button>

        {!validation.success ? (
          <div className="rounded-lg bg-base-200 p-3 text-xs text-base-content/70">
            {validation.issues[0]?.message}
          </div>
        ) : null}

        {validation.success && (nftIssue || allowlistIssue) ? (
          <div className="rounded-lg bg-base-200 p-3 text-xs text-base-content/70">
            {nftIssue ?? allowlistIssue}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error">
            {error}
          </div>
        ) : null}

        {shareUrl ? (
          <div className="grid gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-secondary">
              Share Link
            </div>
            <a
              className="break-all font-mono text-sm underline underline-offset-4"
              href={sharePath ?? "#"}
            >
              {shareUrl}
            </a>
            <button
              className="daisy-btn daisy-btn-sm justify-self-start"
              onClick={handleCopy}
              type="button"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              Copy Share Link
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getShareUrl(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }

  const origin = window.location.origin;
  return origin && origin !== "null" ? `${origin}${path}` : path;
}
