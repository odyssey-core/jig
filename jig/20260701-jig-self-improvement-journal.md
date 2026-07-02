# Build Journal — Jig Self-Improvement

**skill_version**: `1.0.0`
**Plan**: `jig/20260701-jig-self-improvement.md`
**Repo**: `/Users/david/Documents/jig` (`odyssey-core/jig`)
**Started**: 2026-07-01

This journal is the execution record and the shared raw material for the eventual retro.
Orchestrator appends per phase: Decisions, Synthesized contracts (exact strings/numbers the
plan left in prose), Deviations, Green checkpoint (SHA + how verified), Unresolved risks.

## Phase status
- [ ] Phase 0: Scaffold + skill_version plumbing
- [ ] Phase 1: Build Journal + Handoff protocol
- [ ] Phase 2: Retro template + hygiene note
- [ ] Phase 3a: Collector tests failing (right reason)
- [ ] Phase 3b: collect.mjs green · Codex gate
- [ ] Phase 4: Workflow + dry-run · Codex gate
- [ ] Final: gate + retro

---

## Pre-flight (orchestrator)
**Decisions**
- Verified environment: node v20.20.2 (via nvm loader), codex-cli 0.137.0 at `/Users/david/.local/bin/codex`, plugin.json version `1.0.0`.
- `scripts/jig-retro/` and additional workflows do not yet exist — clean slate for the build.
- Dogfooding: I (orchestrator) maintain THIS journal per the protocol Phase 1 will formalize.

**Synthesized contracts (from plan, pinned for the build)**
- Node loader preamble (every subagent shell): `export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; nvm use 20 >/dev/null 2>&1`
- Codex invocation (P3/P4/Final MANDATORY): `codex exec "..." < /dev/null` streamed to a file, never `| tail`.
- skill_version source: `plugins/jig/.claude-plugin/plugin.json` `"version"` = `1.0.0`.

**Green checkpoint**: (pending Phase 0)
**Unresolved risks**: none yet.
