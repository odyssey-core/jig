---
jig_retro: "true"
skill_version: "1.0.0"
plan: "jig/20260701-jig-self-improvement.md"
repo: "odyssey-core/jig"
created: "2026-07-01"
---

# jig-self-improvement — Retro

## Summary
Built the jig self-improvement loop (Build Journal + Fresh-Session Handoff protocol,
structured Retro template, pure retro collector, and a deterministic daily digest
Action) across 5 phases, dogfooding the very journal/handoff/retro artifacts as they
were built. All five success criteria met: the plan mandates journal+handoff; the
Phase 1 handoff dry-run resumed a fresh session with zero re-derivation; the retro
schema parses deterministically; the collector is green under `node --test` and pure;
the workflow is silent-when-empty and upserts one digest, verified by a fixtures
dry-run. Went well: strict pinned contracts (C2–C5) made the schema-shared phases
(retro-template ↔ collector) converge with no drift, confirmed by an independent cold
read. Worth changing: a few gaps where the plan's contract said more than its subagent
prompts did, and where a cross-model reviewer needed the contract as ground truth.

## Findings
```yaml
findings:
  - id: "F1"
    area: "contracts"
    plan_claim: "The Pinned Contract C5 state schema listed 'first_seen' as a field of every seen entry."
    observed_failure: "The Phase 3 subagent prompts (3a tests, 3b implement) never mentioned first_seen, so the collector was built and went green without it; the gap only surfaced when wiring Phase 4."
    orchestrator_workaround: "Mid-build I added an optional 'today' param to dedupe and a first_seen render seam so run.mjs (the date/fs boundary) could stamp it, without breaking the pinned tests."
    proposed_skill_change: "jig should add a gate that every field named in a contract's state/output schema is echoed in the subagent prompt of the phase that produces it, or flags the contract-vs-prompt mismatch before build."
    evidence_refs: ["journal phase 3 Deviations","scripts/jig-retro/collect.mjs"]
    generalizable: "true"
    confidence: "high"
  - id: "F2"
    area: "review"
    plan_claim: "The cross-model gate would surface real defects for the orchestrator to fix."
    observed_failure: "The Codex final review returned 5 P1s, but 2 were contract-correct-by-design (finding-key order is authoring guidance; the scalar first-quote-to-last-quote rule is pinned verbatim in C2) — the reviewer flagged them as drift because it judged against its own notion of strictness, not the pinned contract."
    orchestrator_workaround: "I adjudicated every finding against C2 line-by-line, fixed the 3 real ones, and documented the 2 rejects with rationale rather than blindly applying all 5."
    proposed_skill_change: "jig's cross-model gate step should instruct the external reviewer to treat the plan's Pinned Contracts as ground truth and report deviations FROM them; and instruct the orchestrator to adjudicate each finding against the contract and record rejects, never auto-apply."
    evidence_refs: ["scripts/jig-retro/.codex-final.md","journal Final Quality Gate"]
    generalizable: "true"
    confidence: "high"
  - id: "F3"
    area: "testing"
    plan_claim: "The Phase 3a test cases (the 9 pinned cases) defined the collector contract."
    observed_failure: "Those cases covered the documented happy path but omitted adversarial inputs (missing frontmatter keys, a stray yaml block in the Summary, out-of-enum confidence/generalizable); those hardening gaps only appeared at the final Codex gate for a parser that consumes untrusted org-wide input."
    orchestrator_workaround: "I added the negative-path handling and verified it with ad-hoc targeted checks at the final gate rather than as first-class tests."
    proposed_skill_change: "For a hand-rolled parser over untrusted input, jig should require the test-author phase to include adversarial/negative cases (malformed headers, injection-adjacent bytes, out-of-enum values), not just the documented happy path."
    evidence_refs: ["scripts/jig-retro/collect.test.mjs","scripts/jig-retro/.codex-final.md"]
    generalizable: "true"
    confidence: "medium"
  - id: "F4"
    area: "testing"
    plan_claim: "The plan mandated invoking the cross-model reviewer with a specific streamed-to-file command."
    observed_failure: "The orchestrator's habitual wrapper 'timeout 500 codex ...' failed with 'command not found' because macOS ships no GNU 'timeout'."
    orchestrator_workaround: "Dropped the timeout wrapper and invoked codex directly with the pinned '< /dev/null' redirect streamed to a file."
    proposed_skill_change: "jig plans that pin a CLI invocation should not assume GNU coreutils (timeout/gtimeout/date -d) on macOS; pin a portable invocation or a documented fallback."
    evidence_refs: ["journal phase 3 Decisions"]
    generalizable: "true"
    confidence: "medium"
```
