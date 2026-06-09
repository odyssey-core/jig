---
description: >-
  Audit checklist for reviewing existing plans against the 12 build discipline
  patterns. Use in review mode to score plans and identify gaps.
updated: "2026-04-17"
---

## When to Read This File

Read this when reviewing an existing plan (review mode). Skip if you're
creating a new plan — use [[plan-structure.md]] and [[patterns.md]] instead.

---

# Plan Review Checklist

Score each pattern 1-3:
- **3** = Complete. Pattern is fully present with specific details.
- **2** = Present but incomplete. Pattern exists but lacks specificity.
- **1** = Missing. Pattern is absent or only vaguely referenced.

## Audit

| # | Pattern | Score | Notes |
|---|---------|-------|-------|
| 1 | **Orchestrator**: Does the plan state that the main agent coordinates and never writes code? | | |
| 2 | **TDD**: Does each phase split into Na (tests) and Nb (implementation)? Are test cases specific? | | |
| 3 | **Subagent prompts**: Are prompts copy-pasteable? Do they include file paths, expected behavior, and verification steps? | | |
| 4 | **File ownership**: Is there a matrix showing which agent can edit which files? No overlapping writes? | | |
| 5 | **Status files**: Do subagents write status to /tmp/? Is the naming convention specified? | | |
| 6 | **Parallel allocation**: Is it clear which phases run in parallel vs sequential? Counts specified? | | |
| 7 | **Quality gates**: Is the review pipeline embedded after each phase? All 6 steps present? | | |
| 8 | **Phase verification**: Does each phase have a specific test command with expected result? | | |
| 9 | **Durable save**: Will the plan be saved to jig/ in the repo? | | |
| 10 | **Build checklist**: Are there per-phase checkboxes? | | |
| 11 | **Shared files**: Are types, configs, schemas identified with ownership rules? | | |
| 12 | **Safety rails**: Does every subagent prompt end with "DO NOT edit outside..."? | | |

**Total**: ___/36

## Readiness Scale

| Score | Readiness | Action |
|-------|-----------|--------|
| 33-36 | Ready to build | Approve and save |
| 25-32 | Almost ready | Fill gaps, then approve |
| 17-24 | Needs work | Significant patterns missing |
| <17 | Not ready | Rewrite with [[plan-structure.md]] |

## Common Gaps

1. **Vague subagent prompts** (most common) — Prompts say "implement the module"
   instead of specifying exact files, exact test cases, exact verification command.
   Fix: rewrite each prompt with copy-paste specificity.

2. **No quality gates** — Plan goes straight from Phase 1 to Phase 2 without
   review. Fix: embed the quality gate pipeline from [[quality-gates.md]] after
   every phase.

3. **Overlapping file ownership** — Two concurrent subagents both write to the
   same types file. Fix: identify shared files and assign write access to exactly
   one phase.

4. **Missing TDD split** — Phase says "write tests and implement" instead of
   separating into Na/Nb. Fix: split every build phase into test-first then
   implement-to-pass.

5. **No safety rails** — Subagent prompts don't include file boundaries.
   Fix: add "DO NOT edit any files outside {dir}/" to every prompt.

6. **Missing verification commands** — Phase says "verify it works" without
   a specific command. Fix: specify the exact command and expected output.

## Fixing Gaps

When review mode finds gaps, offer to fix them in-place:

1. Present each gap with its current score and what a score of 3 would look like
2. Ask via AskUserQuestion: "Fix this gap? [A] Yes [B] Skip"
3. For each "yes", rewrite that section of the plan to meet score 3
4. Re-score after all fixes
5. If final score >= 33, the plan is ready
