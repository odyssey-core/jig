---
description: >-
  The 5-step Produce workflow — understand the spec, explore the codebase, create
  the plan (embedding the build discipline patterns), review it, and save it to
  jig/. Read when producing a new implementation plan (jig's default mode).
updated: "2026-07-02"
---

## When to Read This File

Read this when creating a new implementation plan (Produce mode — jig's default).
Work the five steps in order. Skip if you're executing an existing plan
([[execute.md]]) or auditing one ([[review.md]]).

---

# Produce Mode

## Step 1: Understand the Spec

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

## Step 2: Explore the Codebase

Launch Explore agents to understand:

1. **Existing patterns and conventions** — How does this codebase structure code?
   What naming conventions, directory structure, import patterns?
2. **Reuse opportunities** — What already partially solves sub-problems?
   Capture outputs from existing flows rather than building parallel ones.
3. **Test infrastructure** — What framework (vitest, jest, pytest, etc.)?
   Where do tests live? What's the test naming convention? What's the test command?
4. **Shared files** — Types, configs, schemas that multiple phases might touch.
   These need explicit ownership declarations in the plan.

## Step 3: Create the Plan

Enter plan mode. Create the implementation plan following the structure defined in
[[../plan-structure.md]].

The plan MUST include the 12 core build discipline patterns from [[../patterns.md]], plus the
loop/cross-model patterns (13–22) where they apply — especially the **Loop Contract** (pattern
17: L1 tool-loops / L2 independent + cross-model gates / L3 product loops, each with explicit
bounds and stop conditions). For shaping a non-obvious loop, work the Loop Contract directly from
[[../quality-gates.md]]; if the optional `loop-god` companion skill is installed, use it to shape the
loop and embed its Loop Contract into the plan. Every subagent prompt in the plan MUST embed these
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
See [[../quality-gates.md]] for the full pipeline.

## Step 4: Review Pass (optional, recommended)

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
output to a file (don't pipe through `tail`). See [[../reference/cross-model-review.md]] for the
cross-model philosophy.

## Step 5: Approval and Save

Present the plan for user approval via ExitPlanMode. Iteration is expected — the
user will likely review and request changes before approving.

Once approved:
1. Create `jig/` directory in the repo root if it doesn't exist
2. Save the plan as `jig/{YYYYMMDD}-{slug}.md` (e.g., `jig/20260417-auth-refactor.md`)
3. Stamp the plan's Overview with `**Generated by jig skill_version**: {version}`,
   reading `{version}` from `plugins/jig/.claude-plugin/plugin.json` (`"version"`).
   This keeps every plan — and the journal and retro derived from it — interpretable
   as jig evolves.
4. The plan is now the source of truth for building.

The session can then begin executing the plan phase by phase — see [[execute.md]].
The plan contains all the build instructions; Execute mode adds the durable
artifacts that make the build resumable and feed jig's self-improvement loop.
