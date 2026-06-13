import "src/testing/setup";

import { cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  createLidoSweepAction,
  createPublishedActionResponse,
} from "src/testing/fixtures";
import { createInitialBuilderDraft } from "./builderState";
import { ShareActionPanel } from "./ShareActionPanel";

describe("ShareActionPanel", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    mock.restore();
  });

  it("keeps Share Action disabled until the draft is valid", () => {
    const view = render(
      <ShareActionPanel
        allowlistStatus={{ state: "not-selected", blockedTargets: [] }}
        draft={createInitialBuilderDraft()}
        hasActionSteps={false}
      />,
    );

    expect(
      (view.getByRole("button", { name: /Share Action/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("posts a valid Action Definition and shows a /t/ share link", async () => {
    let requestBody: unknown;
    globalThis.fetch = mock(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestBody = JSON.parse(String(init?.body));
        return jsonResponse(createPublishedActionResponse());
      },
    ) as unknown as typeof fetch;

    const view = render(
      <ShareActionPanel
        allowlistStatus={{ state: "allowlist-disabled", blockedTargets: [] }}
        draft={createLidoSweepAction()}
        hasActionSteps
      />,
    );

    await userEvent.click(view.getByRole("button", { name: /Share Action/i }));

    await waitFor(() =>
      expect(view.getByText(/\/t\/stake-lido-abc123/)).toBeTruthy(),
    );
    expect(requestBody).toEqual(createLidoSweepAction());
  });

  it("keeps Share Action disabled when the selected NFT allowlist blocks a target", () => {
    const view = render(
      <ShareActionPanel
        allowlistStatus={{
          state: "blocked",
          blockedTargets: ["0x1111111111111111111111111111111111111111"],
        }}
        draft={createLidoSweepAction()}
        hasActionSteps
      />,
    );

    expect(
      (view.getByRole("button", { name: /Share Action/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      view.getByText("Action targets must be allowlisted before sharing."),
    ).toBeTruthy();
  });

  it("copies the generated share link", async () => {
    const clipboardWrite = mock(async (_value: string) => undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: clipboardWrite },
      configurable: true,
    });
    globalThis.fetch = mock(async () =>
      jsonResponse(createPublishedActionResponse()),
    ) as unknown as typeof fetch;

    const view = render(
      <ShareActionPanel
        allowlistStatus={{ state: "allowlist-disabled", blockedTargets: [] }}
        draft={createLidoSweepAction()}
        hasActionSteps
      />,
    );

    await userEvent.click(view.getByRole("button", { name: /Share Action/i }));
    await waitFor(() =>
      expect(view.getByText(/\/t\/stake-lido-abc123/)).toBeTruthy(),
    );
    await userEvent.click(
      view.getByRole("button", { name: /Copy Share Link/i }),
    );

    expect(clipboardWrite).toHaveBeenCalledWith(
      expect.stringContaining("/t/stake-lido-abc123"),
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
