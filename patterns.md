---
description: >-
  The 12 build discipline patterns that every Jig plan must include. Each pattern
  has rationale (what goes wrong without it) and a concrete plan example.
updated: "2026-04-17"
---

## When to Read This File

Read this when creating a new plan (to ensure all 12 patterns are included) or
when reviewing an existing plan (to check completeness). Skip if you just need
the plan template structure.

---

# The 12 Build Discipline Patterns

These patterns are battle-tested across multiple large builds. Every Jig plan
MUST include all 12. They exist because autonomous builds fail in predictable
ways — these patterns prevent each failure mode.

## 1. Orchestrator Pattern

**Rule**: The main agent coordinates subagents. It never writes code itself.

**Without it**: The agent tries to do everything in one pass, loses context, makes
inconsistent decisions across files, and can't parallelize work.

**In the plan**: "You are the orchestrator. For each phase, launch subagents with
the prompts below. Track progress via the build checklist. Do not write code
directly — delegate to subagents."

## 2. TDD Structure

**Rule**: Every phase splits into Na (write failing tests) and Nb (implement to
make tests pass). Distinguish what's unit-testable, integration-testable, and
E2E-testable.

**Without it**: Tests are an afterthought, miss edge cases, and don't drive design.
Implementation drifts from spec because there's no executable contract.

**In the plan**:
```
### Phase 1a: Tests for auth module
Write tests in tests/auth.test.ts covering:
- Valid login with correct credentials → returns token
- Invalid password → returns 401
- Expired token refresh → returns new token
- Missing required fields → returns 400
Verify: `npm test -- tests/auth.test.ts` → all tests FAIL (no implementation yet)

### Phase 1b: Implement auth module
Implement src/auth.ts to make all Phase 1a tests pass.
Verify: `npm test -- tests/auth.test.ts` → all tests PASS
```

## 3. Exact Subagent Prompts

**Rule**: Every subagent prompt is copy-pasteable with specific file paths,
exact implementations expected, and safety rails.

**Without it**: Vague prompts like "implement the auth module" → subagents
interpret differently, produce inconsistent work, and touch files they shouldn't.

**In the plan**:
```
SUBAGENT PROMPT (Phase 1b):
"Create file src/auth.ts. Implement the AuthService class with methods:
- login(email: string, password: string): Promise<Token>
- refresh(token: string): Promise<Token>
- validate(token: string): Promise<User>

Use bcrypt for password hashing. Use jsonwebtoken for JWT.
All tests in tests/auth.test.ts must pass after your implementation.
Run `npm test -- tests/auth.test.ts` to verify.

DO NOT edit any files outside src/auth.ts.
DO NOT modify any test files.
DO NOT add dependencies without listing them."
```

## 4. File Ownership Matrix

**Rule**: Each parallel subagent has an explicit CAN/CANNOT edit list. No two
concurrent subagents share write access to the same file.

**Without it**: Two subagents modify the same config or type file. Last writer
wins. First subagent's changes silently disappear.

**In the plan**:
```
| File/Dir       | Phase 1 Agent | Phase 2 Agent | Phase 3 Agent |
|----------------|---------------|---------------|---------------|
| src/auth/      | WRITE         | -             | -             |
| src/api/       | -             | WRITE         | -             |
| src/types.ts   | WRITE         | READ          | READ          |
| tests/         | WRITE         | WRITE         | WRITE         |
| package.json   | WRITE         | -             | -             |
```

## 5. Status File Pattern

**Rule**: All subagents write progress to /tmp/{project}-{phase}-{step}.md.
The orchestrator reads these to track progress.

**Without it**: No visibility into subagent progress. Can't tell if a subagent
is stuck, finished, or failed. Can't resume after crashes.

**In the plan**: "Write your progress to /tmp/myapp-phase1a-tests.md. Include:
files created, tests written, any blockers encountered."

## 6. Parallel Subagent Allocation

**Rule**: Specify exactly how many subagents per phase (up to 5) and what runs
in parallel vs sequential. Only parallelize truly independent work.

**Without it**: Sequential bottleneck on independent work. Or worse — parallel
on dependent work, causing race conditions and conflicts.

**In the plan**:
```
Phase 0: 2 parallel (auth + database setup — independent)
Phase 1: 3 parallel (API routes, all independent, no shared files)
Phase 2: 1 sequential (UI — depends on API from Phase 1)
```

## 7. Quality Gates

**Rule**: After each phase commit, run the quality gate pipeline. See
[[quality-gates.md]] for the full pipeline.

**Without it**: Bugs compound across phases. A bad assumption in Phase 1 infects
Phases 2-4. Caught too late, the fix requires rework across all phases.

**In the plan**: Include the quality gate instructions after each phase. The
orchestrator runs them before advancing.

## 8. Phase Verification

**Rule**: All tests MUST pass before committing each phase. No exceptions.

**Without it**: Broken commits cascade. Phase 2 subagent builds on broken Phase 1
foundation. By Phase 3, nobody knows where the bug originated.

**In the plan**: "Verify: run `{test command}`. ALL tests must pass. If any test
fails, fix the failure before committing. Do not proceed to the next phase with
failing tests."

## 9. Durable Spec Save

**Rule**: The approved plan is committed to the repo at `jig/{date}-{slug}.md`.
Not just in conversation context.

**Without it**: Plan lives only in the conversation. On compaction or new session,
the plan is lost or summarized beyond usefulness. The builder loses the detailed
subagent prompts and file ownership matrix.

**In the plan**: Jig saves the plan automatically on approval.

## 10. Build Checklist

**Rule**: Per-phase checkboxes for the orchestrator to track progress.

**Without it**: Orchestrator loses track of what's done. Skips phases or repeats
completed work. No clear indicator of overall progress.

**In the plan**:
```
## Build Checklist
- [ ] Phase 1a: auth tests written and failing
- [ ] Phase 1b: auth implementation passes all tests
- [ ] Phase 1 quality gate: PASSED
- [ ] Phase 2a: API route tests written and failing
- [ ] Phase 2b: API routes implemented and passing
- [ ] Phase 2 quality gate: PASSED
- [ ] Final integration test: all tests pass together
```

## 11. Shared File Identification

**Rule**: Types, configs, schemas, and any files touched by multiple phases are
identified up front with explicit ownership rules.

**Without it**: Two subagents add different type definitions for the same concept.
Or one subagent updates a config while another reads the stale version. Enum values
don't propagate — the #1 bug category in skill graph work.

**In the plan**: "Shared files: `src/types.ts` (Phase 1 writes, all others read),
`tsconfig.json` (Phase 0 only), `.env.example` (Phase 1 adds auth vars)."

**Propagation rule**: When adding a new enum value, status, or config key — grep
ALL consumers. List them in the plan. Every file that reads this value must be
updated in the same phase.

## 12. Safety Rails in Every Prompt

**Rule**: Every subagent prompt includes explicit file boundaries: "DO NOT edit
any files outside {dir}/".

**Without it**: Subagent "helpfully" cleans up imports in an unrelated file.
Refactors a utility it thinks is messy. Introduces a regression in code that
was working fine.

**In the plan**: Always end subagent prompts with:
```
SAFETY RAILS:
- DO NOT edit any files outside {allowed directories}
- DO NOT modify any test files (unless this IS the test-writing phase)
- DO NOT add dependencies without explicit listing
- DO NOT refactor, clean up, or "improve" code outside your scope
- DO NOT delete any files
```

---

# Patterns 13–22: Loop & Cross-Model Discipline

Added 2026-06-09, hardened across a multi-phase autonomous build (the `dropt-page`
toolkit). The first 12 patterns prevent build *chaos*; these prevent *plausible-but-wrong*
work surviving the loop. For the loop-shaping details, see the companion [[loop-god]] skill.

## 13. Cross-Model Verification (highest-value)

**Rule**: For high-risk phases (new external API, shared contracts, security-sensitive, the
final gate), an independent **cross-model** reviewer (`codex exec`) runs in addition to the
Claude reviewer. Two independent models agreeing = high confidence.

**Without it**: a same-model reviewer rationalizes the same blind spots the author had.

**In practice**: across the build, Codex caught real P1s the Claude reviewers missed — a slug
path-traversal, a manifest read-modify-write TOCTOU, a wrong external-API shape, a missing
download timeout, a re-entrancy deadlock trap, a geometry contradiction, a non-hermetic test,
and an `assetKind` path-traversal. **Gotcha**: scope Codex tightly ("review ONLY these files,
do NOT read node_modules, be FAST") and stream to a file — `codex exec ... | tail` buffers and
shows nothing; codex will otherwise rabbit-hole into `node_modules`.

## 14. Build New Alongside — Don't Refactor Live Code Under a Test-Only Guard

**Rule**: To add a feature, do NOT refactor working/live code that's guarded only by its existing
tests. Build a new generic module alongside it and migrate the old caller later, with
characterization/backward-compat tests.

**Without it**: a tangential feature's refactor risks regressing already-shipped, live-verified
behavior; the test suite is a safety *net*, not a safety *guarantee*.

**In the plan**: name the live files as UNCHANGED; add the new module; list "migrate X later" as a
separate future ticket. (This was Codex's single highest-value recommendation in production.)

## 15. Pin External-API Facts in the Plan

**Rule**: Bake exact endpoint ids, request/response shapes, and library call signatures into the
plan. Never write "verify the API at build time" for a risky integration.

**Without it**: the builder makes a plausible guess that passes mocked tests but breaks against the
real API. The riskiest spots are exactly where "verify later" hides the bug.

**In the plan**: e.g. "generate = `fal-ai/flux-2`, input `{prompt, image_size}`, output
`data.images[0].url`; edit = `fal-ai/flux-pro/kontext`, needs `image_url` (upload bytes first)."

## 16. Test-Author ≠ Implementer

**Rule**: A separate agent writes the failing tests (verify RED), then a different agent implements
to green. The implementer must not weaken tests.

**Without it**: an agent that writes its own tests games them — tests pass, behavior is wrong.

**In the plan**: a test-author wave → confirm tests fail for the missing-impl reason → an
implementer wave. The implementer's safety rails forbid editing tests.

## 17. The Loop Contract (L1/L2/L3 tiers + bounds)

**Rule**: Every iterative phase declares which tier it is and its bounds. **L1** = builder
self-correction, evaluated by **tools only** (tests/typecheck/smoke), maxIters 2 (tests) / 3
(impl). **L2** = independent quality loop (separate reviewer + selective Codex), maxRounds 2 (3 for
skills/final). **L3** = product runtime loop (tool + human/visual judgment), maxIters ~5–6.

**Without it**: loops run unbounded or accept garbage; nobody knows who judges or when to stop.

**Guards**: best-so-far checkpoint before rework (improvement is non-monotonic); accept only if the
eval stays green AND defects drop without a new one; revert phase-owned files on regression; STOP
and escalate on (same P1 survives 2 rounds | oscillation | >3 unresolved | maxIters). **maxIters
must be a hard literal you confirm actually binds — an unbound loop + a never-true stop condition
is a token runaway. Run the first iteration attended.**

## 18. Evaluator Independence + Cite-the-Criterion + No Mid-Phase Prompt Mutation

**Rule**: Generator ≠ evaluator (separate context, ideally separate model). Every reviewer finding
MUST cite a violated acceptance criterion (from the prompt, a test, or the Operating Contract); a
finding citing none is downgraded to P2 or rejected. If a loop reveals the *prompt itself* is wrong,
STOP and amend the plan — never let a builder exceed file scope to compensate.

**Without it**: reviewers invent moving-target criteria (scope creep) and self-grading agents pass
themselves.

## 19. Parallel-Safety: Whole-Project Checks + Phase-Scoped Checkpoints

**Rule**: Whole-project checks (e.g. `tsc --noEmit`) are whole-project — during a parallel impl
wave, sibling not-yet-built modules trip them. Run per-module tests *in* the wave; run the full
typecheck ONCE after the wave converges. Git checkpoints/reverts are **phase-file-scoped**
(`git checkout <ckpt> -- <owned paths>`), never a repo-wide checkout that clobbers a sibling phase.

**Without it**: false failures stall parallel work, or a rollback wipes a concurrent phase's output.

## 20. Hermetic Tests & Environment Isolation

**Rule**: Tests must not depend on the absence of a real file, real env vars, or the network. Inject
dependencies (a `run`/`subscribe`/`fetch` seam), add skip-guards (`DISABLE_ENV_LOCAL`), use temp
dirs, restore `process.env`. Subagent shells don't auto-load version managers — every node/npx
command gets the loader preamble.

**Without it**: a real `.env.local` (created for a live run) silently breaks a "no-key" test by
feeding it a key and triggering a real network hang. (Happened; fixed with a skip-guard.)

## 21. Concurrency: Atomic Allocation + Re-entrant Lock

**Rule**: For versioned/append state, allocate ids atomically (`open(..., "wx")`), derive next id
from `manifest ∪ disk`, and serialize read-modify-write under a per-key lock. Make the lock
**in-process re-entrant** (a Set of held keys) so a lock-taking helper called inside `withLock`
doesn't self-deadlock. Mutators that skip the lock (e.g. `accept`) cause lost-record TOCTOUs.

## 22. Barbell + Runaway-Cost Discipline

**Rule**: When two approaches are plausible and you're unsure which wins, build BOTH behind one
interface, tag outputs by method, and compare — the comparison is the deliverable. Separately:
loop runners cost money; cap with a hard literal, watch the stop condition actually fire, and never
leave an unattended loop without a verified bound. (A runaway loop with an unbound iteration cap
burned tokens before manual cancel — the lesson that hardened pattern 17.)
