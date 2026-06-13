# Builder Wizard Prototype Notes

Question: Which multi-step builder structure makes the CommissionRoad Transaction Builder feel less overwhelming once the creator has supplied the basic Action info?

Route: `/?prototype=wizard&variant=A`

Variants:

- `A` - Focused wizard: one active step at a time with completed basics collapsed into a compact summary. Current lead. Right-side readiness/state rail removed; Flow now includes an Action Tree.
- `B` - Command center: compact Action header, phase navigation, main editor, and right-side readiness/state rail.
- `C` - Checklist workbench: persistent checklist rail, active workbench panel, and compact review drawer.

Verdict:

- Pending final creator feedback. Early direction is A, with the top phase cards carrying readiness and Flow carrying the structural transaction tree. Delete this prototype or fold the selected direction into `BuilderView` once a direction wins.
