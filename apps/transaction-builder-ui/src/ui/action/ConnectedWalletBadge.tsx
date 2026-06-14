import { CircleCheck } from "lucide-react";

export function ConnectedWalletBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
      <CircleCheck className="size-3.5" />
      <span>Connected wallet</span>
    </span>
  );
}
