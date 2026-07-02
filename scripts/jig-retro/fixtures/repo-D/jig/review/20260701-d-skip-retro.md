---
jig_retro: "false"
skill_version: "1.4.0"
plan: "jig/20260701-d.md"
repo: "acme/repo-d"
created: "2026-07-01"
---

## Summary

This file is NOT a jig retro (jig_retro is "false"). parseRetro must return null
and the collector must skip it entirely, even though it otherwise looks well-formed.

## Findings

```yaml
findings:
  - id: "F1"
    area: "contracts"
    plan_claim: "Should never be parsed because jig_retro is false."
    observed_failure: "n/a"
    orchestrator_workaround: "n/a"
    proposed_skill_change: "This finding must never reach the digest"
    evidence_refs: ["none"]
    generalizable: "true"
    confidence: "high"
```
