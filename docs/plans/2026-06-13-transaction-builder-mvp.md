# Transaction Builder MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone CommissionRoad Transaction Builder that lets creators define, preview, share, and execute immutable Action Definitions.

**Architecture:** This repo is a standalone Turborepo modeled on CommissionRoad. The UI owns drafting, ABI lookup, validation, snippets, and execution UX; the API stores immutable Published Actions as canonical JSON with a small set of lookup fields. Shared domain packages define the Action schema, compiler, generated summaries, and snippet generation so the builder, Action Page, and API validate the same shape.

**Tech Stack:** Bun, Turborepo, React 19, Vite, TanStack Router, TanStack Query, Wagmi, RainbowKit, Viem, Tailwind v4, DaisyUI, Elysia, PostgreSQL, Drizzle, Zod or TypeBox for runtime schemas.

---

## Dependency Chain

```text
Task 1 (repo scaffold)
  ├─→ Task 2 (domain schema/compiler)
  │     ├─→ Task 5 (builder draft UI)
  │     ├─→ Task 6 (snippet generation)
  │     └─→ Task 7 (Action Page rendering)
  ├─→ Task 3 (CommissionRoad protocol/config copy)
  │     ├─→ Task 5
  │     ├─→ Task 8 (classic execution)
  │     ├─→ Task 9 (NFT/allowlist checks)
  │     └─→ Task 11 (Permit2 funding)
  └─→ Task 4 (API persistence)
        └─→ Task 7

Task 5 → Task 6 → Task 7 → Task 8 → Task 9
Task 10 (Commission Plan/Step Outputs) depends on Tasks 2, 3, 5, 6, 7
Task 11 (ERC20 Permit2 Funding) depends on Tasks 2, 3, 6, 7, 8, 9
```

Dependent tasks should be reviewed and merged before their downstream task starts. Tasks 2, 3, and 4 can start in parallel after Task 1.

## Ground Rules

- Read `CONTEXT.md` before implementation. Use the glossary terms exactly.
- Keep Published Actions immutable.
- Do not add 7702 support in MVP.
- Do not add ENS or fiat estimates in MVP.
- Do not normalize Action Steps into relational tables.
- Do not depend on `../commissionroad` as a workspace dependency.
- Copy only the needed CommissionRoad ABI/address/config files into this repo.
- Use `/t/$slug` for Action Page routes.
- Use `Share Action` as the publishing CTA.
- Use `Execute Action` as the end-user execution CTA.

---

### Task 1: Scaffold The Turborepo

**Files:**

- Create: `package.json`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `.env.sample`
- Create: `packages/typescript-config/package.json`
- Create: `packages/typescript-config/base.json`
- Create: `packages/eslint-config/package.json`
- Create: `packages/eslint-config/base.js`
- Create: `packages/prettier-config/package.json`
- Create: `packages/prettier-config/index.js`
- Create: `apps/transaction-builder-ui/package.json`
- Create: `servers/transaction-builder-api/package.json`

**Step 1: Create the root package metadata**

Use CommissionRoad's root `package.json`, `.npmrc`, `turbo.json`, eslint, prettier, and TypeScript config packages as prior art. Keep package names under a local namespace, for example `@transaction-builder/*`.

Root scripts:

```json
{
  "private": true,
  "type": "module",
  "name": "transaction-builder",
  "packageManager": "bun@1.3.3",
  "workspaces": ["apps/*", "packages/*", "servers/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "format": "turbo run format"
  }
}
```

**Step 2: Add shared config packages**

Copy the shape of:

```text
../commissionroad/packages/typescript-config
../commissionroad/packages/eslint-config
../commissionroad/packages/prettier-config
```

Keep config code minimal. Do not copy unrelated package references.

**Step 3: Add placeholder app/server package manifests**

`apps/transaction-builder-ui/package.json` should include Vite, React, TanStack Router/Query, Wagmi, RainbowKit, Viem, Tailwind, DaisyUI, testing libraries, and config package dependencies.

`servers/transaction-builder-api/package.json` should include Elysia, Drizzle, Postgres driver, and TypeBox or Zod.

**Step 4: Install and verify**

Run:

```bash
bun install
bun run build
```

Expected: install succeeds; build may no-op or pass for placeholder packages.

**Step 5: Commit and PR**

```bash
git checkout -b task/1-scaffold-turborepo
git add package.json turbo.json .gitignore .npmrc .env.sample packages apps servers bun.lock
git commit -m "chore: scaffold transaction builder turborepo"
git push -u origin task/1-scaffold-turborepo
gh pr create --title "Task 1: Scaffold transaction builder turborepo" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 1." \
  --base main
```

---

### Task 2: Define The Action Domain Schema And Compiler

**Files:**

- Create: `packages/transaction-builder-domain/package.json`
- Create: `packages/transaction-builder-domain/src/index.ts`
- Create: `packages/transaction-builder-domain/src/schema.ts`
- Create: `packages/transaction-builder-domain/src/compile.ts`
- Create: `packages/transaction-builder-domain/src/summary.ts`
- Create: `packages/transaction-builder-domain/src/schema.test.ts`
- Create: `packages/transaction-builder-domain/src/compile.test.ts`
- Create: `packages/transaction-builder-domain/src/summary.test.ts`

**Step 1: Write schema tests first**

Create tests for:

- a valid independent ETH Action Definition
- invalid unknown Action Chain
- invalid duplicate Action Variable names
- invalid Step Output reference to a later step
- invalid unused Read Step output
- invalid missing Contract Parameter binding
- valid Published Action with ABI Snapshot

Run:

```bash
bun test packages/transaction-builder-domain/src/schema.test.ts
```

Expected: FAIL because schema does not exist.

**Step 2: Implement the schema**

Model the MVP shape explicitly:

```ts
export type CommissionFormula =
  | { kind: "flat"; amount: string }
  | { kind: "percentage"; bps: number; variable: string };

export type ContractParameterBinding =
  | { kind: "fixed"; value: unknown }
  | { kind: "actionVariable"; name: string }
  | { kind: "stepOutput"; stepId: string; outputIndex: number };

export type ActionStep = {
  id: string;
  kind: "write" | "read" | "sweepErc20" | "sweepErc1155" | "permit2Funding";
  contractId: string;
  functionName: string;
  functionSignature: string;
  parameters: ContractParameterBinding[];
  callValue?: ContractParameterBinding;
};

export type ActionDefinitionV1 = {
  schemaVersion: 1;
  title: string;
  description?: string;
  chainId: 1 | 8453 | 11155111;
  commissionRoadNftId?: string;
  contracts: ContractSnapshot[];
  variables: ActionVariable[];
  steps: ActionStep[];
  commissionToken: CommissionToken;
  commissionFormula: CommissionFormula;
};
```

Use a runtime validator. Prefer the same schema library in UI and API.

**Step 3: Write compiler tests**

Test that:

- no Step Output bindings compiles to `kind: "commissionCall"`
- any Step Output binding compiles to `kind: "commissionPlan"`
- sweep helper target is included in target list
- Permit2 Funding target is included in target list when present
- total ETH value sources are discoverable

Run:

```bash
bun test packages/transaction-builder-domain/src/compile.test.ts
```

Expected: FAIL until compile exists.

**Step 4: Implement compile helpers**

Implement pure helpers only:

```ts
export function getActionShape(definition: ActionDefinitionV1) {
  return hasStepOutputBinding(definition) ? "commissionPlan" : "commissionCall";
}

export function getActionTargets(definition: ActionDefinitionV1): Address[] {
  return uniqueTargetsFromStepsAndSystemFunding(definition);
}

export function validateDraft(definition: unknown): DraftValidationResult {
  return validateSchemaAndSemanticRules(definition);
}
```

Do not encode real calldata yet. That belongs in later tasks.

**Step 5: Write Generated Summary tests**

Test deterministic summary output:

- short Action with Lido `submit` and sweep
- long Action with more than five steps
- unknown contract label falls back to address
- manual ABI source appears in technical metadata

**Step 6: Implement Generated Summary**

The summary must not call an LLM. It should produce structured strings from Action Definition data.

**Step 7: Run package tests**

```bash
bun test packages/transaction-builder-domain
```

Expected: PASS.

**Step 8: Commit and PR**

```bash
git checkout -b task/2-action-domain
git add packages/transaction-builder-domain package.json bun.lock
git commit -m "feat: add action definition domain schema"
git push -u origin task/2-action-domain
gh pr create --title "Task 2: Add action domain schema and compiler" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 2." \
  --base main
```

---

### Task 3: Copy CommissionRoad Protocol ABIs And Chain Config

**Files:**

- Create: `packages/commissionroad-protocol/package.json`
- Create: `packages/commissionroad-protocol/src/index.ts`
- Create: `packages/commissionroad-protocol/src/abis.ts`
- Create: `packages/commissionroad-protocol/src/addresses.ts`
- Create: `packages/commissionroad-protocol/src/chains.ts`
- Create: `packages/commissionroad-protocol/src/permit2.ts`
- Create: `packages/commissionroad-protocol/src/chains.test.ts`

**Step 1: Copy required ABIs**

Copy only needed ABIs from `../commissionroad/protocols/commissionroad-v1/src/generated/abis.ts`:

- `commissionRoadAbi`
- `commissionRoadErc721Abi`
- `commissionVaultAbi`
- Permit2 ABI or minimal Permit2 function ABI for `permitTransferFrom`

**Step 2: Copy supported addresses**

Copy addresses for:

- Ethereum mainnet `1`
- Base `8453`
- Sepolia `11155111`

Required addresses:

- CommissionRoad
- CommissionRoadERC721
- CommissionVault
- CommissionRoadExecutor only if copied for later, but do not use it in MVP
- Permit2 per chain

**Step 3: Write chain config tests**

Test:

- only `1`, `8453`, and `11155111` are supported
- every supported chain has CommissionRoad, NFT, Vault, and explorer config
- ETH sentinel is exported once

Run:

```bash
bun test packages/commissionroad-protocol/src/chains.test.ts
```

Expected: FAIL until exports exist.

**Step 4: Implement chain exports**

Expose:

```ts
export const SUPPORTED_CHAIN_IDS = [1, 8453, 11155111] as const;
export const ETH_SENTINEL = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export function getCommissionRoadAddresses(chainId: SupportedChainId) { ... }
export function getExplorerConfig(chainId: SupportedChainId) { ... }
```

**Step 5: Run tests**

```bash
bun test packages/commissionroad-protocol
```

Expected: PASS.

**Step 6: Commit and PR**

```bash
git checkout -b task/3-copy-protocol-config
git add packages/commissionroad-protocol package.json bun.lock
git commit -m "feat: copy commissionroad protocol config"
git push -u origin task/3-copy-protocol-config
gh pr create --title "Task 3: Copy CommissionRoad protocol config" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 3." \
  --base main
```

---

### Task 4: Add Published Action Persistence API

**Files:**

- Create: `packages/transaction-builder-database/package.json`
- Create: `packages/transaction-builder-database/src/index.ts`
- Create: `packages/transaction-builder-database/src/client.ts`
- Create: `packages/transaction-builder-database/src/schema/actions.ts`
- Create: `packages/transaction-builder-database/drizzle/0000_create_published_actions.sql`
- Create: `servers/transaction-builder-api/src/index.ts`
- Create: `servers/transaction-builder-api/src/actions/routes.ts`
- Create: `servers/transaction-builder-api/src/actions/repository.ts`
- Create: `servers/transaction-builder-api/src/actions/slug.ts`
- Create: `servers/transaction-builder-api/src/actions/routes.test.ts`
- Create: `servers/transaction-builder-api/src/actions/slug.test.ts`

**Step 1: Write slug tests**

Test:

- slug is URL-safe
- slug has expected length
- generator retries on collision at repository boundary

Run:

```bash
bun test servers/transaction-builder-api/src/actions/slug.test.ts
```

Expected: FAIL.

**Step 2: Implement slug generator**

Use cryptographic randomness, not sequential IDs.

**Step 3: Write route tests**

Test:

- `POST /actions` rejects malformed body
- `POST /actions` stores valid Published Action JSON
- `GET /actions/:slug` returns stored action
- `GET /actions/:slug` returns 404 for missing slug

**Step 4: Implement database schema**

Use canonical JSON storage:

```ts
export const publishedActions = pgTable("published_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  chainId: integer("chain_id").notNull(),
  commissionRoadNftId: text("commission_road_nft_id"),
  title: text("title").notNull(),
  schemaVersion: integer("schema_version").notNull(),
  definition: jsonb("definition").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**Step 5: Implement Elysia routes**

API surface:

- `GET /health`
- `POST /actions`
- `GET /actions/:slug`

Server-side validation is schema validation only for MVP. Do not perform chain reads server-side.

**Step 6: Run API tests**

```bash
bun test servers/transaction-builder-api
```

Expected: PASS.

**Step 7: Commit and PR**

```bash
git checkout -b task/4-action-persistence-api
git add packages/transaction-builder-database servers/transaction-builder-api package.json bun.lock
git commit -m "feat: add published action persistence api"
git push -u origin task/4-action-persistence-api
gh pr create --title "Task 4: Add published action persistence API" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 4." \
  --base main
```

---

### Task 5: Build The UI Shell And Builder Draft Page

**Files:**

- Create: `apps/transaction-builder-ui/index.html`
- Create: `apps/transaction-builder-ui/vite.config.ts`
- Create: `apps/transaction-builder-ui/tsconfig.json`
- Create: `apps/transaction-builder-ui/src/main.tsx`
- Create: `apps/transaction-builder-ui/src/router.tsx`
- Create: `apps/transaction-builder-ui/src/ui/App.tsx`
- Create: `apps/transaction-builder-ui/src/ui/index.css`
- Create: `apps/transaction-builder-ui/src/ui/navigation/Header.tsx`
- Create: `apps/transaction-builder-ui/src/ui/builder/BuilderRoute.tsx`
- Create: `apps/transaction-builder-ui/src/ui/builder/BuilderView.tsx`
- Create: `apps/transaction-builder-ui/src/ui/builder/builderState.ts`
- Create: `apps/transaction-builder-ui/src/ui/builder/BuilderView.test.tsx`
- Copy assets from: `../commissionroad/apps/commissionroad-ui/public/commissionRoadLogo.svg`
- Copy assets from: `../commissionroad/apps/commissionroad-ui/public/commissionRoadLogoInverted.svg`

**Step 1: Copy the visual shell**

Copy the CommissionRoad CSS theme, logo assets, RainbowKit/Wagmi setup, and header styling. Strip marketing, mint, portfolio, and staking demo routes.

**Step 2: Write the first builder UI test**

Test that `/` renders:

- header with CommissionRoad logo
- active `Build` nav item
- Action Chain selector
- title input
- description input
- empty Action Steps panel
- Share Action disabled while draft is invalid

Run:

```bash
bun test apps/transaction-builder-ui/src/ui/builder/BuilderView.test.tsx
```

Expected: FAIL.

**Step 3: Implement minimal router and BuilderView**

Use TanStack Router with:

- `/` for the builder
- `/t/$slug` placeholder route added in Task 7

**Step 4: Add local builder state**

Use local React state first. Do not add a global state library.

State includes:

- title
- description
- chainId
- commissionRoadNftId
- contracts
- variables
- steps
- commissionToken
- commissionFormula

**Step 5: Run UI tests and build**

```bash
bun test apps/transaction-builder-ui
bun run --filter transaction-builder-ui build
```

Expected: PASS.

**Step 6: Commit and PR**

```bash
git checkout -b task/5-builder-ui-shell
git add apps/transaction-builder-ui package.json bun.lock
git commit -m "feat: add transaction builder UI shell"
git push -u origin task/5-builder-ui-shell
gh pr create --title "Task 5: Add builder UI shell" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 5." \
  --base main
```

---

### Task 6: Add ABI Lookup, Action Steps, And Live Snippets For Independent ETH Actions

**Files:**

- Create: `apps/transaction-builder-ui/src/ui/contracts/useExplorerAbi.ts`
- Create: `apps/transaction-builder-ui/src/ui/contracts/ContractAddressInput.tsx`
- Create: `apps/transaction-builder-ui/src/ui/contracts/MethodPicker.tsx`
- Create: `apps/transaction-builder-ui/src/ui/builder/ActionStepsEditor.tsx`
- Create: `apps/transaction-builder-ui/src/ui/builder/ActionVariableEditor.tsx`
- Create: `apps/transaction-builder-ui/src/ui/builder/CommissionEditor.tsx`
- Create: `packages/transaction-builder-domain/src/snippets/viem.ts`
- Create: `packages/transaction-builder-domain/src/snippets/wagmi.ts`
- Create: `packages/transaction-builder-domain/src/snippets/snippets.test.ts`

**Step 1: Write snippet tests**

Test:

- generated Viem snippet exports a parameterized function
- generated Wagmi snippet exports a parameterized hook/function
- Action Variables appear as function args
- snippets accept parsed onchain values, not human input strings
- no chain switching code is generated

Run:

```bash
bun test packages/transaction-builder-domain/src/snippets/snippets.test.ts
```

Expected: FAIL.

**Step 2: Implement snippet generation**

For MVP, support independent `commissionCall` Actions only. Output strings for tabs:

- Viem
- Wagmi

Both should be generated from the same action compile model.

**Step 3: Add client-side ABI lookup**

Mirror the existing `useEtherscanContract` pattern from CommissionRoad, but include chain-aware endpoint config for Ethereum mainnet, Base, and Sepolia.

Behavior:

- lookup success stores ABI Snapshot
- proxy lookup stores proxy target and implementation ABI metadata
- lookup failure keeps contract unresolved and shows warning
- manual ABI paste resolves contract with `source: "manual"`

**Step 4: Add method picker**

Group methods:

- Write methods: `payable`, `nonpayable`
- Read methods: `view`, `pure`, labeled as Read Steps

For this task, only allow write methods in generated snippets. Read Steps can be visible but disabled until Task 10.

**Step 5: Add Action Variable binding**

Creators can bind:

- method args to fixed values or Action Variables
- payable Eth Value to fixed ETH amount or Action Variable

**Step 6: Add Commission Formula editor**

Support:

- flat ETH fee
- percentage of one Action Variable

Do not support ERC20 Commission Token yet. Render it disabled with copy: "ERC20 commissions are coming in the Permit2 slice."

**Step 7: Wire live snippets into BuilderView**

Snippets update as the draft changes. Copy buttons only copy the current snippet text. There is no Build button.

**Step 8: Run tests**

```bash
bun test packages/transaction-builder-domain
bun test apps/transaction-builder-ui
bun run build
```

Expected: PASS.

**Step 9: Commit and PR**

```bash
git checkout -b task/6-eth-action-snippets
git add apps/transaction-builder-ui packages/transaction-builder-domain package.json bun.lock
git commit -m "feat: add ETH action builder snippets"
git push -u origin task/6-eth-action-snippets
gh pr create --title "Task 6: Add ETH action snippets" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 6." \
  --base main
```

---

### Task 7: Implement Share Action And `/t/$slug` Action Page

**Files:**

- Create: `apps/transaction-builder-ui/src/network/apiClient.ts`
- Create: `apps/transaction-builder-ui/src/ui/action/ActionRoute.tsx`
- Create: `apps/transaction-builder-ui/src/ui/action/ActionPage.tsx`
- Create: `apps/transaction-builder-ui/src/ui/action/ActionVariableForm.tsx`
- Create: `apps/transaction-builder-ui/src/ui/action/GeneratedSummaryPanel.tsx`
- Create: `apps/transaction-builder-ui/src/ui/action/TechnicalDetailsPanel.tsx`
- Modify: `apps/transaction-builder-ui/src/router.tsx`
- Modify: `apps/transaction-builder-ui/src/ui/builder/BuilderView.tsx`
- Test: `apps/transaction-builder-ui/src/ui/action/ActionPage.test.tsx`
- Test: `apps/transaction-builder-ui/src/ui/builder/ShareAction.test.tsx`

**Step 1: Write Share Action tests**

Test:

- invalid draft keeps Share Action disabled
- valid draft posts to `POST /actions`
- successful response shows `/t/$slug`
- copied Share Link uses `/t/$slug`

**Step 2: Implement API client**

Keep a tiny hand-written fetch client:

```ts
export async function createPublishedAction(definition: ActionDefinitionV1) { ... }
export async function getPublishedAction(slug: string) { ... }
```

Do not generate an API client for MVP.

**Step 3: Implement Share Action**

Share Action:

- validates draft locally
- POSTs canonical Action Definition JSON
- stores returned slug
- shows Share Link

**Step 4: Write Action Page rendering tests**

Test:

- page loads Published Action by slug
- page renders creator title and description
- page renders deterministic Generated Summary
- page renders Technical Details
- wallet connection is not required to inspect page
- Action Variable form renders before wallet connection

**Step 5: Implement `/t/$slug` route**

Use TanStack Router route `/t/$slug`.

**Step 6: Implement Action Variable form**

MVP supports:

- raw address input
- bigint text input
- ETH amount input for Eth Value variables when known

No ENS. No fiat.

**Step 7: Run tests**

```bash
bun test apps/transaction-builder-ui
bun run build
```

Expected: PASS.

**Step 8: Commit and PR**

```bash
git checkout -b task/7-share-action-page
git add apps/transaction-builder-ui package.json bun.lock
git commit -m "feat: add share action and action page"
git push -u origin task/7-share-action-page
gh pr create --title "Task 7: Add Share Action and Action Page" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 7." \
  --base main
```

---

### Task 8: Execute Classic ETH Commission Calls

**Files:**

- Create: `packages/transaction-builder-domain/src/encode/commissionCall.ts`
- Create: `packages/transaction-builder-domain/src/encode/commissionCall.test.ts`
- Create: `apps/transaction-builder-ui/src/ui/action/useActionExecution.ts`
- Create: `apps/transaction-builder-ui/src/ui/action/ExecutionChecklist.tsx`
- Modify: `apps/transaction-builder-ui/src/ui/action/ActionPage.tsx`

**Step 1: Write encoding tests**

Test:

- fixed method arguments encode correctly
- Action Variable arguments encode correctly
- Eth Value variable contributes to total `msg.value`
- ETH Commission Formula contributes to total `msg.value`
- encoded result targets `commissionCall`

**Step 2: Implement `buildCommissionCallExecution`**

Input:

- Published Action
- resolved Action Variable values

Output:

- `to`
- `abi`
- `functionName`
- `args`
- `value`
- `targetList`

**Step 3: Write Action Page execution tests**

Test checklist states:

- disconnected wallet
- invalid form values
- simulation pending
- simulation revert blocks Execute Action
- simulation unavailable allows explicit execute-anyway warning
- simulation success enables Execute Action

**Step 4: Implement Wagmi execution hook**

Use:

- `useSimulateContract`
- `useWriteContract`
- `useWaitForTransactionReceipt`

Do not add chain switching.

**Step 5: Implement Execute Action button**

CTA label: `Execute Action`.

**Step 6: Run tests**

```bash
bun test packages/transaction-builder-domain
bun test apps/transaction-builder-ui
bun run build
```

Expected: PASS.

**Step 7: Commit and PR**

```bash
git checkout -b task/8-execute-eth-commission-call
git add packages/transaction-builder-domain apps/transaction-builder-ui package.json bun.lock
git commit -m "feat: execute classic ETH commission calls"
git push -u origin task/8-execute-eth-commission-call
gh pr create --title "Task 8: Execute ETH Commission Calls" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 8." \
  --base main
```

---

### Task 9: Add NFT Selection And Current Allowlist Checks

**Files:**

- Create: `apps/transaction-builder-ui/src/ui/nfts/useCommissionRoadNfts.ts`
- Create: `apps/transaction-builder-ui/src/ui/nfts/NftPicker.tsx`
- Create: `apps/transaction-builder-ui/src/ui/allowlist/useAllowlistValidation.ts`
- Create: `apps/transaction-builder-ui/src/ui/allowlist/AllowlistValidationPanel.tsx`
- Modify: `apps/transaction-builder-ui/src/ui/builder/BuilderView.tsx`
- Modify: `apps/transaction-builder-ui/src/ui/action/ActionPage.tsx`
- Test: `apps/transaction-builder-ui/src/ui/allowlist/useAllowlistValidation.test.tsx`
- Test: `apps/transaction-builder-ui/src/ui/nfts/NftPicker.test.tsx`

**Step 1: Write NFT picker tests**

Test:

- chain selection is available before wallet connection
- wallet NFT list is filtered by Action Chain
- no NFT state links to official CommissionRoad mint flow
- manual NFT ID fallback exists if API list is unavailable

**Step 2: Implement NFT listing**

Prefer the existing CommissionRoad API portfolio endpoint pattern:

- `GET /portfolio/:walletAddress/nfts`

Add manual NFT ID fallback because NFT enumeration is not guaranteed from the contract alone.

**Step 3: Write allowlist validation tests**

Test:

- allowlist disabled returns valid
- allowlist enabled with all targets returns valid
- missing creator target returns invalid
- missing CommissionRoad sweep helper target returns invalid
- missing Permit2 target returns invalid when Permit2 exists later

**Step 4: Implement Current Allowlist Check**

Read directly from chain:

- `isAllowlistEnabled(nftId)`
- `isCallTargetAllowlisted(nftId, target)` for every target

Do not rely on `AllowlistEnabledUpdated`; current code does not emit it.

**Step 5: Gate Share Action and Execute Action**

Builder:

- invalid form when selected NFT allowlist is enabled and missing targets

Action Page:

- always recheck current allowlist before execution
- block Execute Action and show copy:

```text
This Action can't be executed with the current CommissionRoad NFT allowlist.
The NFT's allowlist does not currently include all contracts this Action calls.
The NFT owner may have changed the allowlist after this Action was shared, or this Action may not have been created by the current NFT owner.
```

Then list missing targets.

**Step 6: Run tests**

```bash
bun test apps/transaction-builder-ui
bun run build
```

Expected: PASS.

**Step 7: Commit and PR**

```bash
git checkout -b task/9-nft-allowlist-validation
git add apps/transaction-builder-ui package.json bun.lock
git commit -m "feat: validate NFT allowlists"
git push -u origin task/9-nft-allowlist-validation
gh pr create --title "Task 9: Add NFT and allowlist validation" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 9." \
  --base main
```

---

### Task 10: Add Commission Plan Support With Read Steps And Step Outputs

**Files:**

- Create: `packages/transaction-builder-domain/src/encode/commissionPlan.ts`
- Create: `packages/transaction-builder-domain/src/encode/commissionPlan.test.ts`
- Modify: `apps/transaction-builder-ui/src/ui/contracts/MethodPicker.tsx`
- Modify: `apps/transaction-builder-ui/src/ui/builder/ActionStepsEditor.tsx`
- Modify: `packages/transaction-builder-domain/src/snippets/viem.ts`
- Modify: `packages/transaction-builder-domain/src/snippets/wagmi.ts`

**Step 1: Write Step Output UI tests**

Test:

- read methods can be selected as Read Steps
- ABI return values appear as Step Outputs
- later Contract Parameters can bind to earlier Step Outputs
- earlier Contract Parameters cannot bind to later Step Outputs
- unused Read Step blocks Share Action

**Step 2: Implement Step Output binding UI**

Keep this simple:

- display return values as `Step 1 output 0`
- use ABI output names when available
- show type

**Step 3: Write commissionPlan encoding tests**

Use the existing CommissionRoad `weiroll.ts` tests as prior art.

Test:

- read step output feeding later write step compiles to `commissionPlan`
- exact-transfer Lido alternate compiles to `commissionPlan`
- sweep-based Lido Action remains `commissionCall`

**Step 4: Implement Weiroll planner integration**

Use the same `@cowprotocol/sdk-weiroll`, `@cowprotocol/sdk-viem-adapter`, and Viem patterns from CommissionRoad tests.

**Step 5: Update snippets**

Generated snippets should switch automatically:

- independent Action -> `commissionCall`
- dependent Action -> `commissionPlan`

**Step 6: Run tests**

```bash
bun test packages/transaction-builder-domain
bun test apps/transaction-builder-ui
bun run build
```

Expected: PASS.

**Step 7: Commit and PR**

```bash
git checkout -b task/10-commission-plan-step-outputs
git add packages/transaction-builder-domain apps/transaction-builder-ui package.json bun.lock
git commit -m "feat: add commission plan step outputs"
git push -u origin task/10-commission-plan-step-outputs
gh pr create --title "Task 10: Add Commission Plan Step Outputs" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 10." \
  --base main
```

---

### Task 11: Add ERC20 Commission Token And Permit2 Funding

**Files:**

- Create: `packages/transaction-builder-domain/src/permit2/permit2Funding.ts`
- Create: `packages/transaction-builder-domain/src/permit2/permit2Funding.test.ts`
- Create: `apps/transaction-builder-ui/src/ui/token/useTokenMetadata.ts`
- Create: `apps/transaction-builder-ui/src/ui/action/usePermit2Preflight.ts`
- Modify: `apps/transaction-builder-ui/src/ui/builder/CommissionEditor.tsx`
- Modify: `apps/transaction-builder-ui/src/ui/action/ExecutionChecklist.tsx`
- Modify: `packages/transaction-builder-domain/src/encode/commissionCall.ts`
- Modify: `packages/transaction-builder-domain/src/encode/commissionPlan.ts`
- Modify: `packages/transaction-builder-domain/src/snippets/viem.ts`
- Modify: `packages/transaction-builder-domain/src/snippets/wagmi.ts`

**Step 1: Write Permit2 Funding tests**

Test:

- ERC20 Commission Token injects system-managed Permit2 Funding target
- Permit2 amount is derived from Action Execution values
- flat ERC20 commission uses token decimals
- percentage ERC20 commission computes from selected Action Variable
- `approve(CommissionRoad)` is never generated

**Step 2: Implement token metadata lookup**

Fetch ERC20:

- `symbol`
- `decimals`
- `name`

Use Viem reads from the selected Action Chain.

**Step 3: Update Commission Editor**

Support:

- ETH
- ERC20 address

When ERC20 is selected:

- show token metadata
- explain Permit2 Funding
- show system-managed funding step in flow preview

**Step 4: Implement Permit2 preflight checklist**

Action Page ERC20 path:

- Connect wallet
- Approve Permit2 if allowance missing
- Sign Permit2 authorization for exact commission amount
- Execute Action

**Step 5: Inject Permit2 call**

Classic mode only:

- prepend `permitTransferFrom` Action Step in compiled payload
- target is Permit2
- recipient is CommissionRoad
- amount is exact commission amount

**Step 6: Update snippets**

Viem/Wagmi snippets should include:

- Permit2 allowance check
- approval transaction helper if needed
- typed-data signing
- parameterized Action Variable args
- final `commissionCall` or `commissionPlan`

**Step 7: Run tests**

```bash
bun test packages/transaction-builder-domain
bun test apps/transaction-builder-ui
bun run build
```

Expected: PASS.

**Step 8: Commit and PR**

```bash
git checkout -b task/11-erc20-permit2-funding
git add packages/transaction-builder-domain apps/transaction-builder-ui package.json bun.lock
git commit -m "feat: add ERC20 Permit2 commission funding"
git push -u origin task/11-erc20-permit2-funding
gh pr create --title "Task 11: Add ERC20 Permit2 Funding" \
  --body "See docs/plans/2026-06-13-transaction-builder-mvp.md Task 11." \
  --base main
```

---

## Final Verification

Run all checks:

```bash
bun run format
bun run lint
bun run test
bun run build
```

Expected: all pass.

Start local services:

```bash
bun run dev
```

Manual QA:

- Open builder at `/`.
- Create an Ethereum mainnet Action with Lido `submit(address)`.
- Bind Eth Value to `stakeAmount`.
- Add CommissionRoad ERC20 sweep helper for stETH to `recipient`.
- Set CommissionRoad NFT ID.
- Set ETH Commission Formula to `0.01% of stakeAmount`.
- Confirm live Viem and Wagmi snippets update.
- Share Action.
- Open `/t/$slug`.
- Confirm Action Page renders before wallet connection.
- Confirm Generated Summary and Technical Details expose variable bindings.
- Fill Action Variables.
- Confirm simulation runs.
- Execute only on a safe test Action or forked/local chain.

## Follow-Up Not In MVP

- 7702 delegated execution.
- ENS inputs.
- Fiat estimates.
- c12d.xyz production short-link redirect.
- One-click allowlist mutation from the builder.
- Exact-output transfer helper.
- Authenticated creator dashboards.
- Editing Published Actions.
