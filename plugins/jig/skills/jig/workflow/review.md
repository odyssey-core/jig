---
description: >-
  The Review workflow — audit an existing plan against the build discipline
  patterns, score each 1–3, and offer to fix gaps in place. Read when reviewing a
  plan (jig review mode).
updated: "2026-07-02"
---

## When to Read This File

Read this when auditing an existing plan (Review mode — `/jig review`). Skip if
you're producing a new plan ([[produce.md]]) or executing one ([[execute.md]]).

---

# Review Mode

When reviewing an existing plan, read [[../review-checklist.md]] and audit the plan
against the 12 core build discipline patterns (the scored checklist), then spot-check the
loop/cross-model patterns (13–22 in [[../patterns.md]]) wherever the plan has loops, external
APIs, parallel phases, or concurrent state.

1. Read the plan file
2. Check each pattern: present, partial, or missing
3. Score each pattern 1-3 (3 = complete, 2 = present but incomplete, 1 = missing)
4. Report gaps with specific suggestions
5. Compute overall readiness score (sum / 36 as percentage)
6. Offer to fix missing patterns in-place
