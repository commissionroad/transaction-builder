# PRD: CommissionRoad Transaction Builder MVP

## Problem Statement

CommissionRoad lets developers monetize onchain flows, but creating a correct CommissionRoad execution is still too manual. A creator must understand target contract ABIs, method parameters, payable values, dynamic user inputs, CommissionRoad NFT IDs, commissions, sweeps, allowlists, Permit2, generated calldata, and frontend integration code. That makes even a straightforward Action, such as staking a user’s ETH into Lido with a percentage commission, harder to build, inspect, share, and reuse than it should be.

Creators need a CommissionRoad-native Transaction Builder that turns contract calls into a reusable Action Definition, gives them safe generated snippets, and creates a Share Link where end users can inspect and execute the Action with clear fee and flow transparency.

## Solution

Build a standalone Transaction Builder for CommissionRoad. The product lets a creator choose an Action Chain, define Action Variables, add contracts and Action Steps through ABI-driven method pickers, configure a CommissionRoad NFT, set a Commission Token and Commission Formula, preview deterministic Generated Summaries and snippets, and use Share Action to publish an immutable Published Action.

The Share Link opens a CommissionRoad-branded Action Page at a short route. The Action Page can be inspected before wallet connection, renders creator-authored copy plus deterministic Technical Details, collects Action Variable values, runs Current Allowlist Check and simulation, handles required preflight steps, and lets the end user Execute Action.

The MVP focuses on classic CommissionRoad execution: Commission Call for independent Actions and Commission Plan for dependent Actions using Step Outputs. ERC20 commissions use Permit2 Funding. EIP-7702, ENS, fiat estimates, and creator dashboards are intentionally out of scope.

## User Stories

1. As an Action creator, I want to open the builder directly, so that I can start building without passing through a marketing page.
2. As an Action creator, I want the builder to look and feel like CommissionRoad, so that the product feels official and familiar.
3. As an Action creator, I want a Build navigation link in the CommissionRoad-style header, so that I understand this is the builder area.
4. As an Action creator, I want to choose an Action Chain first, so that all later contract, NFT, ABI, and execution choices are scoped to one chain.
5. As an Action creator, I want the MVP to support Ethereum mainnet, Base, and Sepolia, so that I can build for current CommissionRoad deployments and test safely.
6. As an Action creator, I want to draft before connecting my wallet, so that I can explore and design an Action without upfront wallet friction.
7. As an Action creator, I want to connect my wallet when I need NFT selection and chain validation, so that wallet requirements happen only when useful.
8. As an Action creator, I want to select a CommissionRoad NFT from my connected wallet filtered by Action Chain, so that commissions go to one of my relevant NFTs.
9. As an Action creator, I want a manual NFT ID fallback, so that I am not blocked if indexed NFT listing is unavailable.
10. As an Action creator without a CommissionRoad NFT on the Action Chain, I want a clear link to the official minting flow, so that I can create the required commission recipient.
11. As an Action creator, I want to paste a contract address, so that the builder can discover available methods.
12. As an Action creator, I want the builder to perform client-side explorer ABI lookup, so that method selection is automatic without extra backend infrastructure.
13. As an Action creator, I want proxy contracts to use implementation ABI metadata while preserving the proxy target address, so that calls are encoded correctly.
14. As an Action creator, I want failed ABI lookups to leave an unresolved contract with a warning, so that I can fix the ABI without restarting.
15. As an Action creator, I want to paste a manual ABI, so that I can build Actions for contracts that explorer lookup cannot resolve.
16. As an Action creator, I want manual ABI usage to be visible in the Action Page, so that end users can distinguish it from explorer-loaded ABIs.
17. As an Action creator, I want ABI Snapshots saved with Published Actions, so that Share Links do not depend on future explorer availability or proxy upgrades.
18. As an Action creator, I want verified Contract Labels when available, so that generated copy and method lists are readable.
19. As an Action creator, I want editable creator Contract Labels, so that I can make complex flows easier to understand.
20. As an end user, I want creator Contract Labels to remain inspectable with raw contract addresses, so that a misleading label cannot hide the actual target.
21. As an Action creator, I want method pickers grouped into write methods and Read Steps, so that I can find the operation I need.
22. As an Action creator, I want payable Call Value shown separately from method arguments, so that ETH sent with a call is explicit.
23. As an Action creator, I want Call Value to be fixed or bound to an Action Variable, so that users can provide ETH amounts later.
24. As an Action creator, I want to create Action Variables with internal names, labels, helper text, and types, so that end users get a friendly form without losing precision.
25. As an Action creator, I want Action Variables reusable across parameters, Call Value, and Commission Formulas, so that repeated user-provided values stay consistent.
26. As an end user, I want to inspect each Action Variable’s internal name and usage, so that a friendly label cannot misrepresent what my input controls.
27. As an Action creator, I want Contract Parameters to support fixed values, Action Variables, and Step Outputs, so that I can model static and dynamic flows.
28. As an Action creator, I want Step Outputs from earlier Action Steps available to later Action Steps, so that dependent Actions can be built without custom contracts.
29. As an Action creator, I want Read Steps to produce Step Outputs for later use, so that I can read chain state inside a Commission Plan.
30. As an Action creator, I want unused Read Steps to block sharing, so that dead reads do not create confusing or useless Published Actions.
31. As an Action creator, I want the builder to infer Action Shape automatically, so that independent Actions become Commission Calls and dependent Actions become Commission Plans.
32. As an Action creator, I want sweep helpers as first-class builder actions, so that I do not need to manually add the CommissionRoad contract to call sweep methods.
33. As an Action creator, I want sweep helpers to clearly say they sweep all available balance, so that I understand the difference between sweep and exact transfer.
34. As an end user, I want sweep behavior shown in the Generated Summary and Technical Details, so that I know what assets are being sent and where.
35. As an Action creator, I want exact output transfers to be possible through normal Step Output binding, so that the primitive model remains small.
36. As an Action creator, I want to set a creator-authored Action name and description, so that users understand the intended purpose.
37. As an end user, I want a deterministic Generated Summary, so that I can inspect what the Action actually does without trusting creator copy alone.
38. As an end user, I want Generated Summary to avoid guessing intent, so that unknown contracts or methods are shown mechanically rather than embellished.
39. As an end user, I want Technical Details available on every Action Page, so that I can inspect internal names, types, bindings, ABI source, targets, and calldata details.
40. As an Action creator, I want flat Commission Formulas, so that I can charge a fixed amount.
41. As an Action creator, I want percentage Commission Formulas based on one Action Variable, so that I can charge percentage-based commissions.
42. As an Action creator, I want ETH as a Commission Token, so that users can pay commissions with native ETH.
43. As an Action creator, I want ERC20 as a Commission Token, so that users can pay commissions in assets such as USDC.
44. As an Action creator, I want ERC20 Commission Tokens to load token metadata, so that amounts can be shown in human units.
45. As an Action creator, I want ERC20 commissions to use Permit2 Funding, so that users do not approve CommissionRoad directly.
46. As an end user, I want the ERC20 commission preflight to show Permit2 approval, Permit2 authorization, and final execution as separate checklist steps, so that I understand each wallet interaction.
47. As an end user, I want Permit2 Funding to use the exact commission amount for my Action Execution, so that I do not grant unnecessary token movement.
48. As an Action creator, I want Viem snippets to update live, so that I can see integration code as I build.
49. As an Action creator, I want Wagmi snippets to update live, so that React app integration is easy.
50. As an Action creator, I want generated snippets to expose Action Variables as typed function arguments, so that the code is easy to drop into an app.
51. As an Action creator, I want snippets to accept parsed onchain values, so that generated code remains precise and avoids UI parsing assumptions.
52. As an Action creator, I want copy buttons for snippets, so that I can quickly bring code into my app.
53. As an Action creator, I want Share Action to be the only publishing action, so that there is no confusing separate Build step.
54. As an Action creator, I want Share Action disabled until the draft is valid, so that I cannot publish malformed Share Links.
55. As an Action creator, I want Share Action to save an immutable Published Action, so that the behavior behind a Share Link cannot change after sharing.
56. As an Action creator, I want Share Links to use random short slugs, so that links are compact and not guessable.
57. As an end user, I want Share Links to open at a short `/t/` route, so that links are compact before future short-link support.
58. As an end user, I want to inspect the Action Page before connecting my wallet, so that I can decide whether the Action is trustworthy first.
59. As an end user, I want to fill Action Variables before connecting my wallet, so that wallet connection is required only for checks and execution.
60. As an end user, I want the Action Page to calculate the concrete commission after I enter values, so that I know the fee before execution.
61. As an end user, I want simulation to run before Execute Action is enabled when simulation is available, so that obvious failures are caught before wallet confirmation.
62. As an end user, I want simulation reverts to block execution and show the reason when available, so that I do not submit known-bad transactions.
63. As an end user, I want an explicit escape hatch if simulation cannot run for tooling or RPC reasons, so that I am not permanently blocked by transient infrastructure failures.
64. As an end user, I want the final CTA to say Execute Action, so that it clearly describes the operation without implying a separate review screen.
65. As an Action creator, I want the builder to validate selected NFT allowlists at share time, so that Actions using disallowed targets cannot be published from the normal UI.
66. As an end user, I want Current Allowlist Check on the Action Page, so that changes after sharing are caught before execution.
67. As an end user, I want missing allowlist targets listed clearly, so that I can understand why an Action is currently unexecutable.
68. As an Action creator, I want system-managed targets included in allowlist validation, so that Permit2 Funding and sweep helper targets are not forgotten.
69. As an Action creator, I want missing allowlist targets flagged as invalid form state, so that I can fix the CommissionRoad NFT configuration before sharing.
70. As an Action creator, I want the builder to link to official CommissionRoad allowlist management rather than mutate allowlists in MVP, so that security-sensitive NFT configuration remains in the existing owner flow.
71. As a backend operator, I want Published Actions stored as canonical JSON with minimal lookup fields, so that immutable Action Definitions are preserved exactly.
72. As a backend operator, I want public unauthenticated reads by slug, so that Share Links work for anyone.
73. As a backend operator, I want schema validation on Published Action creation, so that malformed records are rejected even if the UI is bypassed.
74. As a backend operator, I want chain reads kept out of the MVP backend, so that the server remains small and deployment is straightforward.
75. As a future implementer, I want the Transaction Builder repo to mirror CommissionRoad structure, so that familiar tooling and conventions reduce implementation friction.
76. As a future implementer, I want CommissionRoad ABIs and addresses copied into this repo, so that deployments do not rely on brittle local workspace dependencies.

## Implementation Decisions

- The Transaction Builder will be a standalone Turborepo modeled on CommissionRoad, with UI and server in one repository.
- The UI will open directly to the builder, not a marketing landing page.
- The CommissionRoad header, logo, wordmark, wallet connection pattern, theme, Tailwind/DaisyUI setup, and relevant shared UI conventions will be reused.
- The top-level navigation may use Build as a link to the builder, but the builder itself does not have a Build action.
- Share Action is the creator command that publishes an immutable Published Action and returns a Share Link.
- The Action Page route will be `/t/$slug`.
- Future c12d short links may redirect to Action Page routes, but that is not part of MVP.
- Action Chains are single-chain and limited to Ethereum mainnet, Base, and Sepolia for MVP.
- Action Chain selection comes before Action Step creation.
- CommissionRoad NFT selection is filtered by Action Chain.
- Drafting is allowed before wallet connection.
- Sharing requires a selected CommissionRoad NFT from the chosen Action Chain in the normal UI flow.
- The backend does not enforce NFT ownership in MVP.
- Published Actions are immutable. Editing a shared Action requires creating a new Published Action.
- Published Actions are stored as canonical JSON with minimal relational lookup fields.
- Action Steps are not normalized because Published Actions do not know about each other.
- The backend exposes a small public API for creating and reading Published Actions.
- Public reads by slug are unauthenticated.
- Public creation is unauthenticated in MVP, with schema validation to reject malformed records.
- Random URL-safe slugs are used as public identifiers.
- The Transaction Builder server uses Bun, Elysia, PostgreSQL, and Drizzle, matching CommissionRoad backend conventions.
- CommissionRoad ABIs, deployed addresses, supported chain config, and minimal Permit2 config are copied into this repo.
- The repo must not depend on the neighboring CommissionRoad workspace.
- ABI lookup is client-side for MVP.
- Explorer ABI lookup supports Ethereum mainnet, Base, and Sepolia.
- Manual ABI fallback is always available.
- ABI Snapshots are stored with Published Actions at publish time.
- Proxy lookup stores the called proxy address separately from implementation ABI source metadata.
- Contract Labels distinguish verified labels from creator labels.
- Raw addresses remain inspectable even when labels are present.
- Method pickers group write methods and Read Steps.
- Read Steps are supported because their Step Outputs can feed later Action Steps.
- Unused Read Steps block sharing.
- Action Shape is inferred automatically: independent Actions compile to Commission Call, dependent Actions compile to Commission Plan.
- Step Outputs can only be used by later Action Steps.
- Creator-defined Action Steps run in top-to-bottom order.
- System-managed Permit2 Funding is prepended when needed.
- Commission collection is handled by CommissionRoad in classic execution.
- EIP-7702 is excluded from MVP.
- Call Value is modeled separately from method arguments.
- Call Value may be fixed or filled from an Action Variable.
- Commission Formulas support flat fee or percentage of one Action Variable.
- The builder does not block creators from choosing a semantically odd variable as a percentage base, but it exposes type, usage, and warnings where appropriate.
- ETH and ERC20 Commission Tokens are supported.
- ERC20 commissions use Permit2 Funding only in MVP.
- The builder must not generate direct approve-to-CommissionRoad flows.
- Permit2 Funding amount is calculated at Action Execution time after Action Variables are resolved.
- Viem is the canonical generated-code target.
- Wagmi snippets are generated as React-oriented wrappers around the same call-building semantics.
- Generated snippets accept parsed onchain values as function arguments.
- Generated snippets do not include chain switching.
- Generated snippets are self-contained and do not depend on the Transaction Builder backend at runtime.
- The Action Page renders creator title and description plus deterministic Generated Summary.
- Generated Summary is deterministic and non-AI.
- Technical Details are always available and show variable internal names, types, labels, bindings, ABI source, and execution details.
- Users can inspect the Action Page and fill Action Variables before wallet connection.
- Address Action Variables support raw addresses only in MVP.
- ENS input is excluded from MVP.
- Fiat estimates are excluded from MVP.
- Execution uses simulation before enabling Execute Action when simulation is available.
- Simulation reverts block execution.
- Simulation infrastructure failures can allow an explicit execute-anyway escape hatch.
- The Action Page performs Current Allowlist Check at execution time.
- Share Action performs allowlist validation when possible.
- Missing allowlist targets make the builder form invalid when the selected NFT’s Allowlist is enabled.
- System-managed targets, including sweep helper and Permit2 targets, are included in allowlist validation.
- The builder links to official CommissionRoad allowlist management rather than changing allowlists directly in MVP.
- NFT existence is not a separate preflight. Simulation handles burned or invalid NFT IDs.
- CommissionRoad sweep helpers are first-class builder actions.
- Sweep helpers explicitly describe that they sweep all available balance.
- Exact output transfers are built manually through normal Step Output binding in MVP.

## Testing Decisions

- Tests should assert external behavior at the highest practical seam rather than internal implementation details.
- Pure domain tests cover Action Definition schema validation, Action Shape selection, target extraction, Action Variable validation, Step Output constraints, Read Step validity, Commission Formula validity, Generated Summary, snippet generation, and classic payload encoding.
- Protocol config tests cover supported Action Chains, CommissionRoad addresses, ETH sentinel, Permit2 addresses, and explorer configuration completeness for Ethereum mainnet, Base, and Sepolia.
- API route tests cover Published Action creation, schema rejection, random slug behavior, immutable canonical JSON storage, public read by slug, and not-found behavior.
- Builder UI tests cover Action Chain selection, draft validation, ABI lookup states, manual ABI fallback, Action Variables, Contract Parameters, Call Value, method selection, live snippet updates, copy buttons, NFT selection, allowlist validation, and Share Action.
- Action Page tests cover loading by slug, rendering without wallet connection, creator copy, Generated Summary, Technical Details, Action Variable form behavior, preflight checklist states, simulation states, and Execute Action enablement.
- Chain and wallet behavior should be tested with mocked Wagmi, Viem, and network responses rather than live chain calls in CI.
- Current Allowlist Check should be tested with mocked contract reads for disabled allowlist, fully allowed targets, missing creator targets, missing sweep helper targets, and missing Permit2 targets.
- Permit2 Funding should be tested at the domain/preflight seam for exact amount calculation, allowance status, signature requirement, and final payload injection.
- Commission Plan support should be tested against flows with Step Output dependencies, including a read-output-to-write-input flow and an exact-transfer alternative to a sweep flow.
- Prior art exists in the CommissionRoad codebase for Elysia API route tests, React component tests, Wagmi test configuration, ABI-driven contract calls, Commission Call tests, Commission Plan tests, Permit2 tests, allowlist tests, and portfolio NFT selection behavior.
- Manual QA should include building a Lido ETH staking Action with `stakeAmount`, `recipient`, an ERC20 sweep helper, ETH Commission Token, percentage Commission Formula, Share Action, Action Page inspection, simulation, and safe execution on a test or forked environment.

## Out of Scope

- EIP-7702 delegated execution.
- Gas sponsorship or relayer support.
- ENS input for address Action Variables.
- Fiat estimates for token amounts or commissions.
- Creator dashboards for managing Published Actions.
- Editing Published Actions.
- Deleting Published Actions.
- Authenticated publishing.
- Backend chain reads for ownership or allowlist enforcement.
- One-click allowlist mutation from the builder.
- Exact-output transfer helper.
- c12d production short-link redirect.
- Multi-chain Actions.
- Cross-token Commission Formula conversions.
- Arbitrary freeform formula expressions.
- AI-generated Action summaries.
- Normalized Action Step storage.
- Direct approve-to-CommissionRoad ERC20 funding.
- 7702-specific analytics or indexing changes.

## Further Notes

- The original motivating example is a Lido staking Action where Bob provides a stake amount and recipient address, the Action calls Lido `submit`, sweeps stETH to Bob, and charges a 0.01% ETH commission to CommissionRoad NFT #1.
- The sweep-based Lido flow is a Commission Call because the sweep does not need Lido’s returned amount.
- An exact stETH transfer of the amount returned from Lido `submit` is a Commission Plan because the later step depends on a Step Output.
- ERC20 commissions in classic mode require Permit2 Funding because target contracts see CommissionRoad as `msg.sender`; an ERC20 approval inside the Action would approve from CommissionRoad, not the user.
- Existing CommissionRoad tests demonstrate that direct approval to CommissionRoad is unsafe, so MVP should keep Permit2 as the only ERC20 commission funding path.
- Current CommissionRoad allowlist logic has no default exceptions for CommissionRoad, Permit2, or helper targets. The builder must validate every actual call target.
- Current CommissionRoad code does not emit the documented allowlist-enabled event, so the builder should read current allowlist state directly from chain.
- CommissionRoad NFTs can be burned, but NFT validity should be handled through simulation rather than a dedicated preflight.
- The implementation plan has already been broken into vertical slices for follow-up execution.
