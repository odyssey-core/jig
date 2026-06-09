---
description: >-
  Quality gate pipeline run after each build phase. Defines review ordering,
  cross-model fallback, cold read trigger, and P1/P2 handling. Embed these
  instructions directly in each phase's quality gate section.
updated: "2026-04-17"
---

## When to Read This File

Read this when creating a plan (to embed quality gates after each phase) or
when reviewing an existing plan (to verify quality gates are complete and
correctly ordered).

---

# Quality Gate Pipeline

Run this pipeline after each phase commit. The ordering matters — each step
sees the output of the previous step.

## Pipeline

```
Phase complete → Commit →

  STEP 1: Adversarial Review (parallel, read-only)
  ├── Subagent A: Correctness & Logic
  └── Subagent B: Architecture & Plan Alignment
  Both run in parallel. Both are read-only analysis.

  STEP 2: Cross-Model Review
  ├── If Codex available: codex exec (independent model)
  └── If not: Fresh Claude Agent subagent (independent context)
  Independent second opinion. Cross-model agreement = high confidence.

  STEP 3: Fix P1s
  All P1 (must-fix) findings are addressed before proceeding.
  P2s (should-fix) are noted in the build checklist for the user to decide.

  STEP 4: Simplification Review
  Review for redundancy, dead code, unnecessary complexity.
  Runs AFTER fixes — must see the post-fix state, not stale pre-fix code.

  STEP 5: Convergence Check
  If ≤3 findings remain after fixes → trigger Cold Read (see below).
  If >3 findings → fix and re-run Steps 1-2.

  STEP 6: Advance
  All tests pass. Quality gate logged. Next phase begins.
```

## Step 1: Adversarial Review Prompts

Launch 2 Claude subagents in parallel via the Agent tool:

### Subagent A: Correctness & Logic

```
Review the code changes in this phase for correctness and logic errors.

Check:
- Does the implementation match the test expectations from Phase {N}a?
- Are there edge cases the tests cover but the implementation mishandles?
- Are there off-by-one errors, null checks, or type mismatches?
- Does error handling cover all failure modes?
- Are there race conditions or concurrency issues?

Report findings as:
- [P1] file:line — description (must fix before proceeding)
- [P2] file:line — description (should fix, not blocking)

If no issues found, report "CLEAR — no correctness issues found."
```

### Subagent B: Architecture & Plan Alignment

```
Review the code changes in this phase for architecture consistency
and alignment with the implementation plan.

Check:
- Does the implementation follow the patterns established in prior phases?
- Are new abstractions justified or premature?
- Does the code match the file ownership matrix in the plan?
- Were any files modified that shouldn't have been?
- Is the code consistent with existing project conventions?
- Are there DRY violations or unnecessary duplication?

Report findings as:
- [P1] file:line — description (must fix before proceeding)
- [P2] file:line — description (should fix, not blocking)

If no issues found, report "CLEAR — architecture aligned with plan."
```

## Step 2: Cross-Model Review

### If Codex is available

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
```

If available, run:

```bash
codex exec "Review the recent changes for bugs, logic errors, and architectural
issues. Be brutally honest. Focus on what the code gets WRONG, not what it
gets right. Report as [P1] or [P2] with file:line references." \
  -C "$(git rev-parse --show-toplevel)" -s read-only
```

### If Codex is NOT available

Launch a fresh Claude Agent subagent with the same prompt. The fresh context
provides genuine independence — it hasn't seen the plan creation conversation.

### Cross-Model Agreement

When both Claude adversarial reviewers AND the cross-model reviewer flag the
same issue independently, mark it as **HIGH CONFIDENCE**. These are almost
certainly real issues.

When reviewers disagree, present both perspectives. The user decides.

## Step 3: P1 vs P2 Handling

**P1 (must-fix)**: Fix before proceeding to the next phase. No exceptions.
After fixing, verify the fix didn't break existing tests.

**P2 (should-fix)**: Add to the build checklist as a decision item:
```
- [ ] P2: {description} — fix now or defer? (from Phase {N} quality gate)
```
The user decides P2s. Don't auto-fix P2s without asking.

## Step 4: Simplification Review

After P1 fixes are applied, review for:
- Redundant code introduced by this phase
- Dead code (imports, variables, functions no longer used)
- Unnecessary complexity (could be simpler without losing functionality)
- Consistency with existing code patterns

**Critical**: This runs AFTER fixes, not in parallel with Step 1-2. The
simplification review needs to see the final state of the code, including
any changes from P1 fixes.

## Step 5: Cold Read (Convergence Trigger)

When iterative reviews converge (≤3 findings remaining after fixes), run
one final cold read.

### Cold Read Prompt

```
Forget all prior review context. You are reading this code for the first time.

Trace each function's execution path step by step. At each step, check:
1. Does every referenced file, directory, or field actually exist?
2. Is every instruction or call unambiguous?
3. Could any input cause unexpected behavior?
4. Are there assumptions that were valid in isolation but break
   when the phases are combined?

Focus especially on integration points between this phase and prior phases.
Report any issues found, even if they seem minor.
```

**Why cold read matters**: Iterative reviews verify "was the prior fix applied
correctly?" They don't re-trace execution from scratch. Cross-contamination
bugs (where a fix in one area subtly breaks another) survive iterative reviews
because each round focuses on "did my specific fix work?" not "does the whole
system still work?"

## Embedding in Plans

When creating a Jig plan, embed the quality gate after each phase like this:

```markdown
### Quality Gate: Phase {N}

**Step 1**: Launch 2 adversarial review subagents in parallel:
- Subagent A: Correctness & logic review of Phase {N} changes
- Subagent B: Architecture & plan alignment review of Phase {N} changes

**Step 2**: Cross-model review:
- If `which codex` succeeds: run `codex exec` review
- Otherwise: launch a fresh Claude Agent subagent for independent review

**Step 3**: Fix all P1 findings. Add P2s to build checklist.

**Step 4**: Run simplification review on post-fix state.

**Step 5**: If ≤3 findings remain, run cold read.
If >3 findings, fix and re-run Steps 1-2.

**Step 6**: Verify all tests pass: `{test command}` AND the whole-project typecheck is clean.
Check off: `- [x] Phase {N} quality gate: PASSED`
```

## Loop Bounds & Guards (the gate IS the L2 loop)

The quality gate above is the **L2 loop** from the Loop Contract (pattern 17). Run it with bounds:

- **maxRounds**: 2 for code phases, 3 for skills/final. Only **P1s** force a loop back to the
  builder; P2s go to the user to decide (don't auto-fix P2s).
- **Cross-model (Step 2)**: ALWAYS for the riskiest phases (new external API, shared contracts,
  bootstrap/setup, the final gate); conditional elsewhere (only if a Claude reviewer raises a P1 or
  the phase touches a shared contract). Don't run Codex inside every L1 iteration — it's expensive.
  Scope it to named files and stream to a file (not `| tail`).
- **Cite-the-criterion**: every finding must cite a violated acceptance criterion (prompt, test, or
  Operating Contract); a finding citing none is downgraded to P2 or rejected. No inventing criteria
  mid-loop; no prompt mutation mid-phase (amend the plan instead).
- **Checkpoint / accept / revert**: commit the green state before sending findings back. Accept a
  repair ONLY if tests stay green AND it reduces the open-P1 count (or resolves the targeted finding)
  WITHOUT a new P1. On regression, restore the **phase-owned files** from the checkpoint
  (`git checkout <ckpt> -- <paths>`, never repo-wide) and pass both findings back once.
- **STOP & surface to the user** when ANY of: a P1 survives 2 rounds; tests oscillate; the same
  failure recurs under different patches; or >3 unresolved findings remain.

The L1 loop (inside each builder, before the gate) is **tool-evaluated only** (tests + typecheck +
smoke; no LLM self-critique), bounded to 2 iters for test-writing phases and 3 for implementation.

For shaping these loops on a new feature, the optional companion `loop-god` skill (if installed)
walks you through it; otherwise shape the Loop Contract directly from the pipeline above.
