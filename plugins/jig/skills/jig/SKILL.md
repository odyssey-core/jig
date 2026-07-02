---
name: jig
description: >-
  Turns a well-defined spec into an engineering-ready implementation plan with embedded
  build discipline (TDD, subagent orchestration, quality gates, cross-model review, the
  Loop Contract), drives the build from that plan (build journal + fresh-session handoff
  + structured retro), or audits an existing plan for completeness. Triggers on: /jig,
  /jig review, "plan this feature", "create an implementation plan", "make a build plan",
  "review this plan", "is this plan ready to build", "turn this spec into a plan",
  "resume this build", "write a build retro". Produces plans detailed enough for a fresh
  Claude Code session to build autonomously — and captures what each build learns.
updated: "2026-07-02"
---

# Jig

A precision tool that guides the build. Jig turns a well-defined spec into an
engineering-ready implementation plan with embedded build discipline: TDD structure,
subagent orchestration, quality gates, and safety rails. The plan is detailed enough
that a fresh Claude Code session can read it and build autonomously.

**Named after the machining jig** — a precision tool that guides other tools. The
plan IS the jig. It ensures every cut is repeatable and accurate.

**Prerequisites**: jig assumes you already have a reasonably well-defined idea or spec
— a design doc, a brainstorm/office-hours output, a clear feature request, or a rough
plan that needs build discipline. If you don't have a spec yet, define WHAT to build
first; jig's job is locking in HOW.

This SKILL.md is a routing entry point. Each mode's steps and the deeper reference
material live in the sub-files listed under **Sub-files** — read the ones for the
mode you're in.

## Modes

Jig spans the full build lifecycle — three modes, in order of a typical engagement:

**Produce** (default) — Create a new implementation plan from a spec.
Steps: [[workflow/produce.md]].

**Execute** — Build from an approved plan: maintain a build journal, emit a
fresh-session handoff at a clean phase boundary, and write a structured retro at
the end. This is what makes a build resumable and makes jig self-improving.
Steps: [[workflow/execute.md]].

**Review** — Audit an existing plan against the 12 build discipline patterns.
Invoke with `/jig review` or "review this plan against jig patterns".
Steps: [[workflow/review.md]].

## Workflow Checklist

Track a jig engagement end to end (produce → execute → retro). This survives
context compaction — re-anchor here after any break.

```
- [ ] Spec understood — 95% confidence via clarifying questions (produce.md · Step 1)
- [ ] Codebase explored — patterns, reuse, test infra, shared files (Step 2)
- [ ] Plan drafted — 12 core patterns + loop/cross-model where they apply (Step 3)
- [ ] Plan reviewed — cross-model pass, P1s fixed (Step 4)
- [ ] Plan saved — jig/{YYYYMMDD}-{slug}.md, skill_version stamped (Step 5)
- [ ] Build executed — journal maintained, gate passed each phase (execute.md)
- [ ] Retro written — jig/review/{YYYYMMDD}-{slug}-retro.md (execute.md)
```

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

## Sub-files

Grouped by lifecycle stage. Read the workflow file for the mode you're in, then the
reference/template files it points to.

**Produce** — creating a plan
| File | When to Read |
|------|-------------|
| [[workflow/produce.md]] | The 5-step produce workflow (understand → explore → plan → review → save) |
| [[patterns.md]] | The build discipline patterns (12 core + 13–22 loop/cross-model) and their rationale |
| [[plan-structure.md]] | The plan template — section-by-section output structure |
| [[quality-gates.md]] | The quality-gate pipeline + loop bounds to embed after each phase |

**Execute** — building from a saved plan
| File | When to Read |
|------|-------------|
| [[workflow/execute.md]] | Orchestrating the build: journal → handoff → retro |
| [[build-journal.md]] | Maintain the build journal + emit a fresh-session handoff |
| [[retro-template.md]] | Write the structured retro that feeds the self-improvement loop |

**Review** — auditing an existing plan
| File | When to Read |
|------|-------------|
| [[workflow/review.md]] | The scoring workflow for a plan audit |
| [[review-checklist.md]] | The scored 12-pattern audit checklist |

**Reference** — shared across modes
| File | When to Read |
|------|-------------|
| [[reference/cross-model-review.md]] | Cross-model review philosophy + "What good looks like" success criteria |

## Related

- `loop-god` *(optional companion, install separately)* — interactive loop-designer; emits the
  Loop Contract + paste-ready orchestrator/subagent/gate prompts. If installed, use it to shape a
  non-obvious loop, then embed the result in a jig plan. Jig works fully without it.
- `ody-skill-polish` — bring skills (including this one) to production quality.

> `loop-god`, jig's companion loop-designer, is coming to the grimoire marketplace soon.
