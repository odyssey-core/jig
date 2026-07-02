---
description: >-
  The append-only build journal and the fresh-session handoff protocol. The
  journal captures the orchestrator's synthesized connective tissue (decisions,
  pinned strings/numbers/APIs, deviations) so it survives a session; the handoff
  lets a fresh session resume a build with zero re-derivation.
updated: "2026-07-01"
---

## When to Read This File

Read this while EXECUTING a plan (not while writing one): once at the start of a
build to open the journal, at every phase boundary to append a phase entry, and
when context runs high at a clean boundary to emit a handoff prompt. Skip it if
you are creating or reviewing a plan — that is [[plan-structure.md]] and
[[review-checklist.md]].

---

# Why the Journal Exists

**Assumption**: the build is run by the orchestrator pattern ([[patterns.md]] #1)
and the approved plan is already saved at `jig/{YYYYMMDD}-{slug}.md`
([[patterns.md]] #9).

The plan is written before the build; it cannot know everything the build will
discover. As the orchestrator drives phases, it synthesizes **connective
tissue**: the non-obvious decisions it makes, the exact strings/numbers/APIs the
plan left in prose that the build had to pin down, and the places the build
deviated from the plan and why. That synthesized material lives only in the
orchestrator's working context. On compaction, a crash, or a new session, it
dies — and the next builder re-derives it (slowly, differently, wrongly).

The journal is where that connective tissue is written down as it is produced. It
is the **shared raw material** for BOTH outputs that outlive the session: the
Fresh-Session Handoff (Protocol B, below) and the end-of-build retro
([[retro-template.md]]). Write it once; both consumers read it.

---

# A) Journal Protocol

The journal lives at `jig/{YYYYMMDD}-{slug}-journal.md` — same date and slug as
the plan it tracks (Pinned Contract C1). One journal per build.

**Append-only.** Never rewrite history. If an earlier entry was wrong, correct it
with a NEW dated entry that says so — do not edit the old lines.

## Header (write once, at build start)

```
# Build Journal — {slug}

- **skill_version**: {version}   (from plugins/jig/.claude-plugin/plugin.json)
- **plan**: jig/{YYYYMMDD}-{slug}.md
- **repo**: {absolute repo path}

## Phase status
- [ ] Phase 0 — {name}
- [ ] Phase 1 — {name}
- [ ] Phase 2 — {name}
- [ ] ...
```

Check a line in `## Phase status` the moment that phase's gate PASSES. This
checklist is the at-a-glance resume pointer.

## Per-phase entry (append when a phase completes)

Append one block per phase, with these labeled sections. Omit a section only if
it is genuinely empty (write "none").

```
## Phase {N} — {name}  ({YYYY-MM-DD HH:MM})

### Decisions
- {non-obvious choices made during the phase, and why the alternative lost}

### Synthesized contracts
- {exact strings / numbers / API shapes the plan left in prose but the build
  had to pin — e.g. "retry budget = 3 (not 'a few')", "endpoint = fal-ai/flux-2,
  output data.images[0].url"}

### Deviations
- {where the build departed from the plan, and why}

### Green checkpoint
- SHA: {git sha}
- Verified by: {exact command run} → {exact result, e.g. "42 passing, 0 failing"}

### Unresolved risks
- {anything still open, handed to the next phase}
```

The **Synthesized contracts** and **Green checkpoint** sections are the ones a
fresh session cannot reconstruct on its own — treat them as mandatory.

---

# B) Fresh-Session Handoff Protocol

**Trigger**: a CLEAN phase boundary — the phase's quality gate PASSED, tests are
green, and the checkpoint is committed — AND context is high (~50% used). Both
conditions. **Never hand off mid-phase**: a handoff in the middle of a phase
carries un-checkpointed, unverifiable state and defeats the purpose.

**Action**: emit a SELF-CONTAINED, copy-paste continuation prompt. A fresh
session pasted this prompt (plus the plan and journal it points to) resumes the
build with zero re-derivation of the orchestrator's connective tissue.

**Acceptance bar**: a fresh session given ONLY {plan, journal, handoff prompt}
resumes the build with zero re-derivation. If the fresh session has to ask you
for the repo path, the last checkpoint, or a decision already made — the handoff
failed. Test it by imagining a builder who has read nothing else.

## Handoff prompt template

Fill every slot. Emit the filled prompt to the user (or the next session) as a
fenced block they can copy verbatim.

```
You are the orchestrator continuing an in-progress Jig build. Do not re-plan.

- **repo**: {absolute repo path}
- **plan**: {jig/YYYYMMDD-slug.md}   (read this first — it is the source of truth)
- **journal**: {jig/YYYYMMDD-slug-journal.md}   (read this second — the build's
  connective tissue: decisions, pinned contracts, deviations, checkpoints)

**Progress**
- Current phase (DONE): Phase {N} — gate PASSED, checkpoint committed.
- Last green checkpoint SHA: {sha}   (verified by: {command} → {result})
- Next phase: Phase {N+1} — {name}.

**Top non-obvious decisions so far** (do not revisit without cause):
- {decision 1}
- {decision 2}

**Active constraints / contracts still in force**:
- {pinned string/number/API that later phases depend on}
- {file-ownership or safety rail still binding}

**EXACT next action**:
{one concrete instruction — e.g. "Begin Phase {N+1}: launch the test-author
subagent for {module} per the plan's Phase {N+1}a prompt; verify RED; then the
implementer wave."}

Read the plan and journal at the paths above, confirm the last checkpoint, then
do the EXACT next action. Continue appending to the journal per build-journal.md.
```
