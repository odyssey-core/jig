---
description: >-
  The Execute workflow — orchestrate the build from a saved plan and maintain the
  three durable artifacts: build journal (during), fresh-session handoff (at a
  clean boundary), and structured retro (at the end). Read when building a plan.
updated: "2026-07-02"
---

## When to Read This File

Read this when building from an approved plan (Execute mode). Skip if you're still
producing the plan ([[produce.md]]) or auditing one ([[review.md]]).

---

# Execute Mode

Producing the plan is only half of jig. **Executing** it — building phase by phase
from the saved plan — is where the discipline pays off, and where jig captures what
it learns. The plan already carries every build instruction (subagent prompts, quality
gates, file ownership); this mode adds three durable artifacts on top.

You are the orchestrator ([[../patterns.md]] #1 + #17): read the plan, build phase by
phase, and maintain these three artifacts as you go.

## 1. Build journal — during the build

Maintain an append-only journal at `jig/{YYYYMMDD}-{slug}-journal.md` per
[[../build-journal.md]] — one entry per phase capturing the decisions, the exact
strings/numbers/APIs the plan left in prose (synthesized contracts), deviations, and
the green checkpoint (SHA + how verified). This is the orchestrator's connective
tissue, which otherwise dies with the session.

## 2. Fresh-session handoff — at a clean boundary, high context

At a clean phase boundary (gate PASSED, checkpoint committed) when context runs high
(~50%), emit a self-contained copy-paste handoff prompt per [[../build-journal.md]] so a
fresh session resumes with zero re-derivation. Never hand off mid-phase.

## 3. Structured retro — at the end / at a session break

Produce a retro at `jig/review/{YYYYMMDD}-{slug}-retro.md` per [[../retro-template.md]]:
a short human summary plus one machine-parseable findings block. This is the first
input to the self-improvement loop — org-wide automation harvests the generalizable
findings to improve the jig skill itself. The highest-signal field is
`orchestrator_workaround` (what the session had to invent because the plan or skill
fell short).

All three artifacts are stamped with `skill_version` so findings stay interpretable
as jig evolves. Draft-for-human-review only — the loop never auto-edits the skill.
