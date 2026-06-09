---
name: jig
description: >-
  Turns a well-defined spec into an engineering-ready implementation plan with embedded
  build discipline (TDD, subagent orchestration, quality gates, cross-model review, the
  Loop Contract), or audits an existing plan for completeness. Triggers on: /jig,
  /jig review, "plan this feature", "create an implementation plan", "make a build plan",
  "review this plan", "is this plan ready to build", "turn this spec into a plan". Produces
  plans detailed enough for a fresh Claude Code session to build autonomously.
updated: "2026-06-09"
---

# Jig

A precision tool that guides the build. Jig turns a well-defined spec into an
engineering-ready implementation plan with embedded build discipline: TDD structure,
subagent orchestration, quality gates, and safety rails. The plan is detailed enough
that a fresh Claude Code session can read it and build autonomously.

**Named after the machining jig** — a precision tool that guides other tools. The
plan IS the jig. It ensures every cut is repeatable and accurate.

## Prerequisites

Jig assumes you already have a reasonably well-defined idea or spec. This could be:
- A design doc, blueprint, or product spec
- Output from a brainstorming or office-hours session
- A well-articulated feature request with clear goals
- An existing rough plan that needs build discipline

If you don't have a spec yet, define what you want to build first. Jig's job starts
when you know WHAT to build and need to lock in HOW.

## Modes

**Produce** (default) — Create a new implementation plan from a spec.

**Review** — Audit an existing plan against the 12 build discipline patterns.
Invoke with: `/jig review` or "review this plan against jig patterns"

---

## Produce Mode

### Step 1: Understand the Spec

Read the provided spec, idea, or design doc. Then ask clarifying questions via
AskUserQuestion until you reach **95% confidence** across these areas:

- **Technical decisions**: Frameworks, libraries, patterns. Any hard constraints?
- **Edge cases**: Empty input, concurrent access, network failure, auth edge cases
- **Integration points**: What existing code does this touch? External APIs?
- **Scope boundaries**: What is explicitly NOT included? Where do we stop?
- **Success criteria**: How do we verify each phase is done? What does "working" mean?
- **Existing solutions**: What already partially solves this? Can we reuse?

Keep asking until 95% confident. Each question should surface a non-obvious
decision — don't ask about things determinable from the codebase. If a question
has an obvious answer, state your assumption and move on.

**Scope challenge** (before planning): What existing code already solves sub-problems?
What is the minimum set of changes? If the plan would touch 8+ files or introduce
2+ new services, that's a complexity smell — challenge whether the same goal can
be achieved with fewer moving parts.

### Step 2: Explore the Codebase

Launch Explore agents to understand:

1. **Existing patterns and conventions** — How does this codebase structure code?
   What naming conventions, directory structure, import patterns?
2. **Reuse opportunities** — What already partially solves sub-problems?
   Capture outputs from existing flows rather than building parallel ones.
3. **Test infrastructure** — What framework (vitest, jest, pytest, etc.)?
   Where do tests live? What's the test naming convention? What's the test command?
4. **Shared files** — Types, configs, schemas that multiple phases might touch.
   These need explicit ownership declarations in the plan.

### Step 3: Create the Plan

Enter plan mode. Create the implementation plan following the structure defined in
[[plan-structure.md]].

The plan MUST include the 12 core build discipline patterns from [[patterns.md]], plus the
loop/cross-model patterns (13–22) where they apply — especially the **Loop Contract** (pattern
17: L1 tool-loops / L2 independent + cross-model gates / L3 product loops, each with explicit
bounds and stop conditions). For shaping a non-obvious loop, use the companion [[loop-god]] skill
and embed its Loop Contract into the plan. Every subagent prompt in the plan MUST embed these
principles:

**From Karpathy:**
- State assumptions explicitly before implementing. If uncertain, stop and ask.
- Minimum code that solves the problem. No speculative features or abstractions.
- Surgical changes only — touch only what the task requires.
- Every step has verifiable success criteria: "run X, expect Y."

**From the orchestrator model:**
- The builder reads the plan and coordinates subagents. It never writes code itself.
- Each subagent gets a complete, self-contained prompt with all context needed.
- File ownership is explicit — each subagent knows what it CAN and CANNOT edit.
- Safety rails in every prompt: "DO NOT edit any files outside {dir}/"

Quality gate instructions are embedded directly in the plan after each phase.
See [[quality-gates.md]] for the full pipeline.

### Step 4: Review Pass (optional, recommended)

After creating the plan, offer an independent review:

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
```

**If Codex available**: Offer to run `codex exec` review of the plan. Prompt:
"You are a brutally honest technical reviewer. Find what the plan missed: logical
gaps, unstated assumptions, overcomplexity, feasibility risks, missing dependencies."

**If not**: Offer to launch a Claude adversarial subagent (fresh Agent with
independent context) with the same prompt.

The reviewer checks:
- Are the build discipline patterns present (12 core + the loop/cross-model patterns where relevant)?
- Are subagent prompts specific enough to execute without ambiguity?
- Are file ownership boundaries clear and non-overlapping?
- Are external-API facts pinned (not "verify at build")? Are loops bounded with stop conditions?
- Are there logical gaps, missing tests, or unstated assumptions?

Fix findings before presenting for approval. Scope the Codex review tightly and stream its
output to a file (don't pipe through `tail`).

### Step 5: Approval and Save

Present the plan for user approval via ExitPlanMode. Iteration is expected — the
user will likely review and request changes before approving.

Once approved:
1. Create `jig/` directory in the repo root if it doesn't exist
2. Save the plan as `jig/{YYYYMMDD}-{slug}.md` (e.g., `jig/20260417-auth-refactor.md`)
3. The plan is now the source of truth for building

The session can then begin executing the plan phase by phase. The plan contains
all instructions needed — no special skill required for the build phase.

---

## Review Mode

When reviewing an existing plan, read [[review-checklist.md]] and audit the plan
against the 12 core build discipline patterns (the scored checklist), then spot-check the
loop/cross-model patterns (13–22 in [[patterns.md]]) wherever the plan has loops, external
APIs, parallel phases, or concurrent state.

1. Read the plan file
2. Check each pattern: present, partial, or missing
3. Score each pattern 1-3 (3 = complete, 2 = present but incomplete, 1 = missing)
4. Report gaps with specific suggestions
5. Compute overall readiness score (sum / 36 as percentage)
6. Offer to fix missing patterns in-place

---

## Cross-Model Review

Jig uses cross-model review as a quality signal. Two independent models agreeing
on a finding is stronger than one model's thorough analysis.

- **Codex available**: Use `codex exec` for independent plan review
- **Codex not available**: Use a fresh Claude Agent subagent (independent context,
  no shared conversation history — genuine independence)

Cross-model tension (reviewers disagree) is surfaced to the user. Neither model
auto-incorporates the other's recommendations. The user decides.

## Gotchas

- **"Verify the API at build" is where bugs hide.** Pin exact external endpoint ids,
  request/response shapes, and call signatures in the plan (pattern 15). A plausible guess passes
  mocked tests and breaks against the real API.
- **Don't refactor working/live code under a test-only guard for a tangential feature** (pattern
  14). Build new alongside; migrate later. Name the live files UNCHANGED in the plan.
- **A loop with no machine-checkable evaluator converges on nonsense.** Define the evaluator
  before the loop; bound every loop with a hard literal maxIters + a stop condition, and run the
  first iteration attended (pattern 17). An unbound loop is a token runaway.
- **Whole-project typecheck during a parallel impl wave fails on sibling not-yet-built modules**
  (pattern 19). Per-module tests in the wave; full typecheck once after convergence.
- **Codex rabbit-holes into `node_modules` and `| tail` buffers its output.** Scope reviews to
  named files ("do NOT read node_modules, be FAST") and stream to a file.
- **Subagent shells don't auto-load version managers** — every node/npx/tsx command in a subagent
  prompt needs the loader preamble, or it fails with "command not found".
- **Tests must be hermetic** (pattern 20) — a real `.env`/secret file or the network can silently
  break a "no-key" test. Inject deps, add skip-guards, use temp dirs.
- **The scorecard is a conversation, not a grade.** Not every pattern applies to every plan; mark
  N/A deliberately rather than forcing all of them.

## What Good Looks Like

A jig plan is ready to build when:
- A fresh Claude Code session could execute it with no extra context — every subagent prompt is
  copy-paste runnable with file paths, a verify command, and safety rails.
- File ownership is explicit and non-overlapping; shared files are written in exactly one phase.
- Every loop has a tier, a maxIters, a checkpoint, and a STOP/escalate trigger (the Loop Contract).
- External-API facts are pinned, not deferred. High-risk phases have a cross-model gate.
- A cross-model review of the plan found no unaddressed P1s before approval.
- The plan is saved to `jig/{YYYYMMDD}-{slug}.md` in the repo as the durable source of truth.

## Sub-files

| File | When to Read |
|------|-------------|
| [[patterns.md]] | The build discipline patterns (12 core + 13–22 loop/cross-model) and their rationale |
| [[plan-structure.md]] | When creating a plan — this is the template for the output |
| [[quality-gates.md]] | When you need quality gate pipeline + loop-bounds details |
| [[review-checklist.md]] | When auditing an existing plan (review mode) |

## Related

- [[loop-god]] — interactive loop-designer; emits the Loop Contract + paste-ready orchestrator/
  subagent/gate prompts. Use it to shape a non-obvious loop, then embed the result in a jig plan.
- `ody-skill-polish` — bring skills (including this one) to production quality.

> Future: jig + loop-god are slated to be packaged as Odyssey grimoire marketplace plugins.
