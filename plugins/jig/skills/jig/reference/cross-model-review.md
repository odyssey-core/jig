---
description: >-
  The cross-model review philosophy (why an independent second model is jig's
  strongest quality signal) plus "What Good Looks Like" — the success criteria for
  a jig plan and a jig build. Read when running a review gate or self-checking output.
updated: "2026-07-02"
---

## When to Read This File

Read this when running a cross-model review gate, or when you want the success bar
for a jig plan or build (self-evaluation). Referenced from the Produce review step
([[../workflow/produce.md]]) and the Execute artifacts ([[../workflow/execute.md]]).

---

# Cross-Model Review

Jig uses cross-model review as a quality signal. Two independent models agreeing
on a finding is stronger than one model's thorough analysis.

- **Codex available**: Use `codex exec` for independent plan review
- **Codex not available**: Use a fresh Claude Agent subagent (independent context,
  no shared conversation history — genuine independence)

Cross-model tension (reviewers disagree) is surfaced to the user. Neither model
auto-incorporates the other's recommendations. The user decides.

Scope every cross-model review tightly ("review ONLY these files, do NOT read
node_modules, be FAST") and stream its output to a file — `codex exec ... | tail`
buffers and shows nothing, and codex will otherwise rabbit-hole into `node_modules`.

---

# What Good Looks Like

A jig plan is ready to build when:
- A fresh Claude Code session could execute it with no extra context — every subagent prompt is
  copy-paste runnable with file paths, a verify command, and safety rails.
- File ownership is explicit and non-overlapping; shared files are written in exactly one phase.
- Every loop has a tier, a maxIters, a checkpoint, and a STOP/escalate trigger (the Loop Contract).
- External-API facts are pinned, not deferred. High-risk phases have a cross-model gate.
- A cross-model review of the plan found no unaddressed P1s before approval.
- The plan is saved to `jig/{YYYYMMDD}-{slug}.md` in the repo as the durable source of truth.

A jig build (Execute Mode) went well when:
- The journal has one entry per phase with synthesized contracts + a green checkpoint SHA — a fresh
  session could resume from `{plan, journal, handoff}` alone with zero re-derivation.
- A structured retro exists at `jig/review/{YYYYMMDD}-{slug}-retro.md`, its findings block parses,
  and each generalizable finding names a concrete `orchestrator_workaround`.
