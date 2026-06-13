# Builder Wizard Prototype Notes

Question: Which multi-step builder structure makes the CommissionRoad Transaction Builder feel less overwhelming once the creator has supplied the basic Action info?

Route: `/?prototype=wizard&variant=A`

Variants:

- `A` - Focused wizard: one active step at a time with completed basics collapsed into a compact summary. Current lead. Right side is now only a compact sticky Call Tree showing contract nodes and method calls. Empty Flow starts directly in an Action Step composer, and resolved methods are visible rows instead of a hidden dropdown.
- `B` - Command center: compact Action header, phase navigation, main editor, and right-side readiness/state rail.
- `C` - Checklist workbench: persistent checklist rail, active workbench panel, and compact review drawer.

Verdict:

- Pending final creator feedback. Early direction is A, with the top phase cards carrying readiness, a persistent right-side Call Tree carrying lightweight structure, and step creation treated as a paste-address composer. Delete this prototype or fold the selected direction into `BuilderView` once a direction wins.
