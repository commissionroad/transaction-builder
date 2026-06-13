import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { AllowlistStatus } from "./useAllowlistStatus";

export function AllowlistNotice({ status }: { status: AllowlistStatus }) {
  if (
    status.state === "not-selected" ||
    status.state === "allowlist-disabled" ||
    status.state === "allowed"
  ) {
    return null;
  }

  if (status.state === "loading") {
    return (
      <div className="flex gap-3 rounded-lg border border-base-300 bg-base-200 p-3 text-sm text-base-content/70">
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
        <span>Checking the selected NFT allowlist.</span>
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{status.message}</span>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border border-error/30 bg-error/10 p-3 text-sm">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" />
        <div>
          <div className="font-semibold text-error">
            Action targets are not allowlisted
          </div>
          <p className="mt-1 text-base-content/70">
            This Action tries to call contracts that are not on the selected
            CommissionRoad NFT allowlist. The creator may have changed the
            allowlist after this link was shared, or this Action may not have
            been created by the NFT owner.
          </p>
        </div>
      </div>
      <ul className="grid gap-1">
        {status.blockedTargets.map((target) => (
          <li className="break-all font-mono text-xs" key={target}>
            {target}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AllowlistOkNotice({ status }: { status: AllowlistStatus }) {
  if (status.state !== "allowed") {
    return null;
  }

  return (
    <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secondary" />
      <span>All Action targets are allowed by the selected NFT.</span>
    </div>
  );
}
