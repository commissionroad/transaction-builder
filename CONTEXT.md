# Transaction Builder

The Transaction Builder helps developers define user-facing CommissionRoad executions and share them with end users. It uses CommissionRoad's existing protocol language so builder concepts stay aligned with the contracts and documentation.

## Language

**CommissionRoad NFT**:
An onchain identity that owns the right to receive commissions routed through CommissionRoad. The NFT owner can claim accumulated commissions and controls any allowlist for that NFT.
_Avoid_: CR NFT, app account

**Allowlist**:
The per-CommissionRoad NFT list of contract targets permitted for Actions when allowlisting is enabled. If the selected NFT's Allowlist is enabled, every Action Step target and system-managed funding target must be allowed before the Action can be shared.
_Avoid_: Contract whitelist

**Current Allowlist Check**:
The Action Page's execution-time check that the selected CommissionRoad NFT still permits every target used by a Published Action. A Published Action can become temporarily unexecutable if the NFT's Allowlist changes after sharing.
_Avoid_: Publish-time allowlist check

**Commission**:
A fee attached to a CommissionRoad execution and credited to a CommissionRoad NFT, minus any protocol fee. The integrating app decides the commission amount before the execution is submitted.
_Avoid_: Platform fee, protocol fee

**Commission Formula**:
A flat fee or percentage-of-variable rule that determines the commission amount for an Action. The formula is evaluated before the Action is carried out, and CommissionRoad receives the resulting concrete commission amount.
_Avoid_: Fee expression

**Commission Token**:
The asset used to pay an Action's commission. A Commission Token is either ETH or a fixed ERC20 chosen by the Action creator.
_Avoid_: Fee token

**Permit2 Funding**:
The ERC20 funding path for classic CommissionRoad Actions. The user approves Permit2 if needed, signs an exact Permit2 authorization, and the Action pulls the required ERC20 commission amount into CommissionRoad before commission collection.
_Avoid_: Approve CommissionRoad

**Action**:
A reusable, user-facing onchain flow with dynamic inputs and a commission. An Action can be carried out through a Commission Call or a Commission Plan, depending on whether its contract steps are independent or dependent.
_Avoid_: Transaction, recipe

**Action Definition**:
The reusable description of an Action created by an app developer. It includes the Action Steps, Action Variables, Commission Token, Commission Formula, and CommissionRoad NFT that will receive commissions.
_Avoid_: Template

**Published Action**:
An immutable Action Definition that has been saved for sharing. A Published Action cannot be edited; changing an Action requires creating and publishing a new Action Definition.
_Avoid_: Editable share link

**Action Chain**:
The single blockchain network where an Action Definition is carried out. The Action Chain is chosen before adding Action Steps and filters which CommissionRoad NFTs can receive commissions for the Action.
_Avoid_: Multi-chain action

**Action Execution**:
One user-filled run of an Action Definition. During an Action Execution, Action Variables are resolved and exact transaction values, commission amounts, Permit2 funding, and call data are produced.
_Avoid_: Transaction

**Share Link**:
A URL that opens a specific Action Definition for an end user. A Share Link starts an Action Execution by asking the user to fill any required Action Variables.
_Avoid_: Referral link

**Share Action**:
The creator command that saves an immutable Published Action and returns its Share Link. Share Action is the final publishing step for an Action Definition.
_Avoid_: Build

**Action Page**:
The CommissionRoad-branded page opened from a Share Link. It explains the Action, collects Action Variable values, previews the commission, and lets the user carry out the Action.
_Avoid_: Generic transaction page, sharelink page

**Technical Details**:
The inspectable explanation of a Published Action's exact bindings and execution data. Technical Details show each Action Variable's internal name, type, creator label, and where it is used.
_Avoid_: Advanced settings

**Generated Summary**:
A deterministic, non-AI explanation of a Published Action produced from its Action Definition. The Generated Summary describes the Action Chain, step count, known method calls, variable bindings, commission, and dependencies without guessing intent.
_Avoid_: AI summary

**Action Variable**:
A named placeholder supplied when someone carries out an Action. Action Variables can be reused across contract parameters, call values, and commission formulas, and may have creator-authored display labels that help users understand them.
_Avoid_: Dynamic field, action input

**Action Step**:
One operation in an Action's flow, usually a contract method call against a target contract. An Action can contain multiple Action Steps while still being carried out by a single user-submitted wallet transaction.
_Avoid_: Transaction

**Read Step**:
An Action Step that reads contract state to produce a Step Output for a later Action Step. A Read Step creates or participates in a dependent Action carried out as a Commission Plan.
_Avoid_: View call

**ABI Snapshot**:
The contract ABI saved with a Published Action at publish time. An ABI Snapshot preserves how the Action was built even if explorer lookups fail later or a proxy implementation changes.
_Avoid_: Live ABI

**Step Output**:
A value produced by an Action Step that can be used by a later Action Step. Using a Step Output creates a dependent Action that must be carried out as a Commission Plan.
_Avoid_: Weiroll state slot

**Contract Parameter**:
A value passed into a contract method or call value slot as part of an Action. A Contract Parameter can be fixed by the Action creator or filled from an Action Variable.
_Avoid_: Action input

**Call Value**:
The ETH amount sent with an Action Step. Call Value is separate from method arguments and can be fixed or filled from an Action Variable.
_Avoid_: Payable parameter

**Contract Label**:
A human-readable name for a contract used in an Action. Verified labels come from trusted chain or explorer metadata when available, while creator labels are editable and must remain inspectable with the contract address.
_Avoid_: Contract name

**Commission Call**:
A CommissionRoad execution for a sequence of independent Action Steps plus a commission. Use this when later Action Steps do not need values produced by earlier Action Steps.
_Avoid_: Standard call, batch transaction

**Commission Plan**:
A CommissionRoad execution for a dependent Action where later Action Steps can use values produced by earlier Action Steps.
_Avoid_: Weiroll transaction
