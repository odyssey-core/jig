---
description: >-
  Template for the plan document Jig produces. Defines the sections, their order,
  and what each must contain. Use when creating a new plan in produce mode.
updated: "2026-04-17"
---

## When to Read This File

Read this when creating a new plan in produce mode. This is the template — fill in
each section based on the spec, codebase exploration, and clarifying Q&A.

---

# Plan Document Template

The plan is saved to `jig/{YYYYMMDD}-{slug}.md` in the repo. It must be
self-contained: a fresh Claude Code session should be able to read this file
and execute the build autonomously without any additional context.

---

## Section 1: Overview

```markdown
# {Project/Feature Name} — Implementation Plan

**Created**: {date}
**Spec source**: {where the spec came from — design doc, blueprint, conversation}
**Goal**: {1-2 sentence summary of what we're building and why}
**Success criteria**: {How do we know the whole thing is done? Be specific.}
```

## Section 2: Scope

```markdown
## Scope

### IN scope
- {Concrete deliverable 1}
- {Concrete deliverable 2}

### NOT in scope
- {Explicitly deferred item} — {why deferred}
- {Explicitly deferred item} — {why deferred}

### What already exists
- {Existing code/flow that solves part of this} — {reuse strategy}
```

## Section 3: Phase Breakdown

Each phase follows TDD: Na = tests (failing), Nb = implementation (passing).

```markdown
## Phases

### Phase 1a: Tests for {component name}

**Goal**: Write failing tests that define the contract for {component}.
**Subagent count**: 1
**Verify**: `{test command}` — all new tests FAIL (no implementation yet)

**Files**:
- CREATE: `tests/{component}.test.{ext}`
- READ (for context): `src/{related-existing-file}`

**Test cases**:
1. {Input} → {expected output/behavior}
2. {Edge case input} → {expected output/behavior}
3. {Error case} → {expected error/behavior}
4. {Boundary case} → {expected behavior}

<details>
<summary>Subagent prompt (copy-paste ready)</summary>

Create file `tests/{component}.test.{ext}`. Write tests covering:

1. {Specific test case with exact inputs and expected outputs}
2. {Specific test case}
3. {Specific test case}
4. {Specific test case}

Use {test framework} conventions matching the existing test files in `tests/`.
Import types from `src/types.{ext}` — do not create new type definitions.

Verify: run `{test command}`. All tests should FAIL (implementation doesn't exist yet).
Write status to /tmp/{project}-phase1a-tests.md.

SAFETY RAILS:
- DO NOT edit any files outside `tests/{component}.test.{ext}`
- DO NOT create implementation files
- DO NOT modify existing test files
- DO NOT add dependencies

</details>

---

### Phase 1b: Implement {component name}

**Goal**: Implement {component} to make all Phase 1a tests pass.
**Subagent count**: 1
**Depends on**: Phase 1a complete
**Verify**: `{test command}` — all tests PASS

**Files**:
- CREATE: `src/{component}.{ext}`
- READ: `tests/{component}.test.{ext}`, `src/types.{ext}`
- MODIFY: `src/index.{ext}` (add export)

<details>
<summary>Subagent prompt (copy-paste ready)</summary>

Create file `src/{component}.{ext}`. Implement to make all tests in
`tests/{component}.test.{ext}` pass.

Read the test file first to understand the expected interface.
{Specific implementation guidance — patterns to use, libraries, approach}

State assumptions explicitly before implementing. If something is unclear,
note it in your status file rather than guessing.

Minimum code that solves the problem. No speculative features.
Touch only the files listed — nothing else.

Verify: run `{test command}`. ALL tests must pass.
Write status to /tmp/{project}-phase1b-impl.md.

SAFETY RAILS:
- DO NOT edit any test files
- DO NOT edit any files outside src/{component}.{ext} and src/index.{ext}
- DO NOT add dependencies without listing them in status file
- DO NOT refactor or "improve" existing code

</details>

---

### Quality Gate: Phase 1

{See [[quality-gates.md]] — embed the full pipeline here}
```

**Repeat the Phase Na/Nb + Quality Gate pattern for each subsequent phase.**

## Section 4: Parallel Execution Plan

```markdown
## Parallel Execution

| Phase | Subagents | Mode | Rationale |
|-------|-----------|------|-----------|
| 0     | 2         | Parallel | {component A} and {component B} are independent |
| 1     | 3         | Parallel | All API routes, no shared files |
| 2     | 1         | Sequential | UI depends on API from Phase 1 |

**Parallel safety**: Phases {X} and {Y} both read `src/types.{ext}` but
neither writes to it (written in Phase 0). Safe to parallelize.
```

## Section 5: File Ownership Matrix

```markdown
## File Ownership

| File/Directory     | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
|--------------------|---------|---------|---------|---------|
| src/auth/          | WRITE   | -       | -       | -       |
| src/api/           | -       | WRITE   | -       | -       |
| src/ui/            | -       | -       | WRITE   | -       |
| src/types.ts       | WRITE   | READ    | READ    | READ    |
| tests/             | WRITE   | WRITE   | WRITE   | WRITE   |
| package.json       | WRITE   | -       | -       | -       |

**Shared files**: `src/types.ts` is written ONLY in Phase 0. All subsequent
phases READ it. If a later phase needs new types, add them to Phase 0 first.

**Propagation rule**: When adding a new enum value or config key, these
files must ALL be updated in the same phase: {list all consumers}.
```

## Section 6: Build Checklist

```markdown
## Build Checklist

- [ ] Phase 0: project setup / shared types
- [ ] Phase 1a: {component} tests written and failing
- [ ] Phase 1b: {component} implementation passes all tests
- [ ] Phase 1 quality gate: PASSED
- [ ] Phase 2a: {component} tests written and failing
- [ ] Phase 2b: {component} implementation passes all tests
- [ ] Phase 2 quality gate: PASSED
- [ ] Phase 3a: {component} tests written and failing
- [ ] Phase 3b: {component} implementation passes all tests
- [ ] Phase 3 quality gate: PASSED
- [ ] Final: all tests pass together (`{full test command}`)
- [ ] Final quality gate: PASSED
```

## Section 7: Orchestrator Instructions

```markdown
## How to Execute This Plan

You are the orchestrator. Follow this plan phase by phase.

1. For each phase, launch subagents using the exact prompts provided above.
   DO NOT write code yourself — delegate to subagents.
2. After each subagent completes, verify the success criteria listed.
3. After each phase, run the quality gate pipeline (embedded after each phase).
4. Check off completed items in the Build Checklist.
5. If a quality gate fails, fix the issue before advancing.
6. If you're unsure about anything, stop and ask rather than guessing.

**Principles to follow throughout**:
- State assumptions before acting. If uncertain, ask.
- Minimum code. No speculative features.
- Surgical changes. Touch only what the plan says.
- Every step has a verifiable check. Run it.
```

## Section 8: Diagrams (as needed)

Include ASCII diagrams for:
- Data flow (how data moves through the system)
- State machines (if any component has state transitions)
- Dependency graph (what depends on what)
- Architecture (if the change involves multiple services/layers)

Place diagrams near the phase that implements them.
