import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { Permit2Preflight } from "./usePermit2Preflight";

export function ExecutionChecklist({
  preflight,
}: {
  preflight: Permit2Preflight;
}) {
  if (preflight.kind !== "erc20") {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-lg border border-base-300 bg-base-200 p-3 text-sm">
      <div className="font-medium">Permit2 funding</div>
      <ChecklistItem done={preflight.isConnected} label="Connect wallet" />
      <ChecklistItem
        action={
          preflight.approval.needsApproval ? (
            <button
              className="daisy-btn daisy-btn-xs"
              disabled={
                preflight.approval.isPending || preflight.approval.isLoading
              }
              onClick={preflight.approval.approve}
              type="button"
            >
              {preflight.approval.isPending || preflight.approval.isLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              Approve
            </button>
          ) : null
        }
        done={preflight.approval.isDone}
        label="Approve Permit2"
      />
      <ChecklistItem
        action={
          !preflight.signature.isDone ? (
            <button
              className="daisy-btn daisy-btn-xs"
              disabled={
                !preflight.approval.isDone || preflight.signature.isPending
              }
              onClick={() => void preflight.signature.sign()}
              type="button"
            >
              {preflight.signature.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              Sign
            </button>
          ) : null
        }
        done={preflight.signature.isDone}
        label="Sign exact authorization"
      />
      <ChecklistItem done={preflight.canExecute} label="Execute Action" />
      {preflight.approval.error ? (
        <div className="text-xs text-error">
          {preflight.approval.error.message}
        </div>
      ) : null}
      {preflight.signature.error ? (
        <div className="text-xs text-error">
          {preflight.signature.error.message}
        </div>
      ) : null}
    </div>
  );
}

function ChecklistItem({
  action,
  done,
  label,
}: {
  action?: React.ReactNode;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <Circle className="size-4 text-base-content/40" />
        )}
        <span className={done ? "" : "text-base-content/70"}>{label}</span>
      </div>
      {action}
    </div>
  );
}
