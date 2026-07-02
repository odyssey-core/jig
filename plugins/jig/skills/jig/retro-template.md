---
description: >-
  The structured retro a build session writes after a build or at a session
  break. It is the first input to the org self-improvement loop: a human summary
  plus one machine-parseable findings block that org-wide automation harvests to
  improve the jig skill. Defines the exact file format, frontmatter keys, and the
  findings-block grammar the Phase 3 parser asserts.
updated: "2026-07-01"
---

## When to Read This File

Read this after finishing a build, or at a clean session break, when you are
about to write a retro at `jig/review/{YYYYMMDD}-{slug}-retro.md`. Skip it while
you are creating or reviewing a plan ([[plan-structure.md]], [[review-checklist.md]])
or mid-build journaling ([[build-journal.md]]).

---

# Why the Retro Exists

**Assumption**: the build ran the orchestrator pattern and produced a plan at
`jig/{YYYYMMDD}-{slug}.md` plus a build journal per [[build-journal.md]]. The
retro is the distilled, machine-readable output of that session — org-wide
automation reads the findings block from many repos to find where the jig skill
and its plans repeatedly fell short, and rolls the generalizable ones into a
digest that drives skill changes.

Because a retro is read by org-wide automation AND by teammates in other repos,
it must be **portable and hand-parseable**, not free prose.

> **HYGIENE — read before you write.** A retro leaves this repo: it is consumed
> by org-wide automation and read by teammates you do not control. It MUST contain
> NO secrets, credentials, tokens, API keys, PII, or proprietary business
> specifics. Generalize everything: write "an external mint API", not the real
> endpoint URL or customer name; "a payments provider", not the vendor and account
> id. If a finding cannot be stated without a secret, restate the underlying
> lesson generically or drop it.

---

# Retro File Format (Contract C2)

A retro file has three parts, in this order:

1. **YAML frontmatter** — the text between the first line `---` and the next line
   `---`, both at column 0.
2. A human **`## Summary`** section — keep it short (a few sentences: what was
   built, how it went, the one or two things worth changing).
3. A **`## Findings`** section containing exactly ONE fenced findings block.

**The findings block** is the lines between an opening fence that is EXACTLY three
backticks immediately followed by `yaml` (`` ```yaml ``, nothing else, at column 0)
and the next closing fence of three backticks (`` ``` ``, nothing else, at column
0). There is **at most ONE `## Findings` block per file**; the parser reads the
FIRST one.

## Frontmatter keys

All keys are REQUIRED; all values are strings:

| key | value |
|-----|-------|
| `jig_retro` | `true` / `false` |
| `skill_version` | the jig `skill_version` the build ran under |
| `plan` | path/name of the plan this retro is about |
| `repo` | `owner/name` |
| `created` | `YYYY-MM-DD` |

**`repo` is advisory, not trusted.** Org automation overrides the frontmatter
`repo` with the actual search-derived owner/repo it found the file under. Fill it
in honestly, but do not rely on it as identity.

## Findings-block grammar

This is a tiny hand-parseable YAML subset, **NOT arbitrary YAML**. Stay inside it
exactly or findings get dropped.

- The **first line inside the block** is `findings:`.
- Each finding **starts** with `  - id: "F1"` — 2-space indent, `- id:` first.
- Every **subsequent key** is `    key: "value"` — 4-space indent.
- EVERY scalar value is **double-quoted, on a single line**. No block scalars, no
  multiline values, no comments inside the block.
- **Value escaping**: a value MUST NOT contain a literal double-quote `"` or a
  newline. If you need a quote character, use a single quote `'`. (The parser reads
  the value as the text between the first `"` after `key:` and the last `"` on that
  line.)
- `evidence_refs` is a **single-line inline array** of double-quoted strings, e.g.
  `["phase 2","notes.md"]`.

**Required finding keys — exactly these, in this order:**

`id, area, plan_claim, observed_failure, orchestrator_workaround, proposed_skill_change, evidence_refs, generalizable, confidence`

- `generalizable` is one of `"true"` | `"false"`.
- `confidence` is one of `"low"` | `"medium"` | `"high"`.
- **Unknown keys are ignored.** A finding **missing a required key is silently
  skipped and counted** by the parser — a malformed finding just vanishes from the
  digest, so proof-read the required keys before you ship.

## `area` enum (Contract C3)

Closed set; anything not in it maps to `other`:

`subagents | contracts | testing | sequencing | handoff | ownership | review | honesty | other`

## What actually matters in a finding

`orchestrator_workaround` is the **highest-signal field**. It records what the
session had to invent because the plan or the skill fell short — the manual patch,
the extra gate, the re-sequencing, the context the plan should have pinned. That
invention is the raw material the org digest turns into a skill change; a finding
with a vague or empty workaround is nearly worthless.

Guidance:

- Cite concrete evidence in `evidence_refs` (journal phase, file, gate output) so
  a reader can check the claim without you.
- Mark `generalizable: "false"` for one-repo idiosyncrasies. Those are **EXCLUDED
  from the org digest** — use it honestly so the digest is not polluted by
  repo-specific noise.
- Keep `## Summary` short; the findings block carries the signal.

---

# Complete Example

```yaml
findings:
  - id: "F1"
    area: "contracts"
    plan_claim: "The plan said 'verify the mint API shape at build time'."
    observed_failure: "The external mint API returned a nested envelope, so mocked tests passed but the real call 500'd on first run."
    orchestrator_workaround: "I hand-pinned the exact request/response shape into a fixtures file mid-build and added a contract test the plan never specified."
    proposed_skill_change: "jig should force external-API shapes to be pinned in the plan (pattern 15), never deferred to 'verify at build'."
    evidence_refs: ["journal phase 3","jig/review/20260701-mint-retro.md"]
    generalizable: "true"
    confidence: "high"
  - id: "F2"
    area: "sequencing"
    plan_claim: "The plan ran the whole-project typecheck inside the parallel impl wave."
    observed_failure: "Typecheck failed on sibling modules that were not built yet, so every wave subagent reported a false red."
    orchestrator_workaround: "I switched the wave to per-module tests and moved the full typecheck to a single gate after convergence."
    proposed_skill_change: "jig plan-structure should default parallel waves to per-module checks with one post-wave full typecheck (pattern 19)."
    evidence_refs: ["journal phase 4"]
    generalizable: "true"
    confidence: "medium"
  - id: "F3"
    area: "other"
    plan_claim: "The plan assumed the local seed script was idempotent."
    observed_failure: "Re-running the seed in this repo double-inserted rows because of a repo-specific unique-index quirk."
    orchestrator_workaround: "I added a truncate step before seeding, specific to this repo's schema."
    proposed_skill_change: "None generalizable; note it in this repo's own docs."
    evidence_refs: ["journal phase 2"]
    generalizable: "false"
    confidence: "low"
```
