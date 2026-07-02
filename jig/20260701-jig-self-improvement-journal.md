# Build Journal — Jig Self-Improvement

**skill_version**: `1.0.0`
**Plan**: `jig/20260701-jig-self-improvement.md`
**Repo**: `/Users/david/Documents/jig` (`odyssey-core/jig`)
**Started**: 2026-07-01

This journal is the execution record and the shared raw material for the eventual retro.
Orchestrator appends per phase: Decisions, Synthesized contracts (exact strings/numbers the
plan left in prose), Deviations, Green checkpoint (SHA + how verified), Unresolved risks.

## Phase status
- [x] Phase 0: Scaffold + skill_version plumbing
- [x] Phase 1: Build Journal + Handoff protocol
- [x] Phase 2: Retro template + hygiene note
- [x] Phase 3a: Collector tests failing (right reason)
- [x] Phase 3b: collect.mjs green · Codex gate
- [x] Phase 4: Workflow + dry-run · Codex gate
- [x] Final: gate + retro

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

**Unresolved risks**: none yet.

---

## Phase 0 — Scaffold + skill_version plumbing
**Decisions**
- Ran via general-purpose Agent (write-capable), exact plan prompt. Surgical, 5 files.
- `{version}` kept as a literal placeholder in SKILL.md/plan-structure.md — it is filled at plan-write time by reading plugin.json `"version"`, not hardcoded. Matches "read from ... version".

**Synthesized contracts**
- collect.mjs stub export names locked: `normalize, parseRetro, fingerprint, dedupe, renderDigest` (P3 tests import these).
- `[[build-journal.md]]` / `[[retro-template.md]]` are intentional forward-ref wikilinks (created P1/P2) — Final gate wikilink scan must pass once those exist.

**Deviations**: none.
**Green checkpoint**: `2be6936` — verified `node --test scripts/jig-retro/` → 1 pass; `grep skill_version` hits both skill files.
**Gate**: Phase 0 conditional cross-model — trivial scaffold, no Claude P1 → Codex not required. PASSED.
**Unresolved risks**: none.

---

## Phase 1 — Build Journal + Fresh-Session Handoff
**Decisions**
- build-journal.md matches house voice (block-scalar description, `updated: "2026-07-01"`, When-to-Read, then protocol). Two protocols A/B as specified.
- Handoff template is fully fenced with fill-in slots; dry-run sim confirms a fresh agent resumes from {plan, journal, handoff} alone.

**Synthesized contracts**
- Handoff acceptance bar operationalized: "if the fresh session must ask for repo path / last checkpoint / a decision already made → handoff failed."
- Journal marks the `## Phase status` line the moment a phase gate PASSES (at-a-glance resume pointer).

**Deviations**: none.
**Green checkpoint**: `21cf46f` — dry-run handoff sim PASSED (fresh agent named "begin Phase 3" with zero re-derivation; halted only on nonexistent toy paths = correct).
**Gate**: Phase 1 conditional cross-model (skill-doc) — no Claude P1 → Codex not required. PASSED.
**Unresolved risks**: `[[retro-template.md]]` wikilink is a forward-ref until Phase 2 lands — Final wikilink scan will confirm resolution.

---

## Phase 2 — Structured Retro template + hygiene note (SHARED CONTRACT C2/C3)
**Decisions**
- retro-template.md reproduces C2/C3 exactly. Builder caught and reworded an accidental column-0 ```yaml produced by prose line-wrap — would have opened a stray fence. Good catch; the parser reads the FIRST column-0 ```yaml block, so a stray one before the real example would have broken discovery.

**Synthesized contracts (PINNED — P3 parser must assert identically)**
- Frontmatter keys (5, all string): `jig_retro, skill_version, plan, repo, created`.
- Finding keys (9, this order): `id, area, plan_claim, observed_failure, orchestrator_workaround, proposed_skill_change, evidence_refs, generalizable, confidence`.
- area enum (C3): `subagents | contracts | testing | sequencing | handoff | ownership | review | honesty | other`; unknown → `other`.
- `generalizable ∈ {"true","false"}`, `confidence ∈ {"low","medium","high"}`. Missing required key → skipped-and-counted (no throw). Value = text between first `"` after `key:` and last `"` on the line.
- Exactly ONE column-0 findings block per file; fences at lines 128 (```yaml) / 157 (```).

**Deviations**: none.
**Green checkpoint**: `8e684d6` — verified: only 2 column-0 fences (one block); invisible-char scan clean; frontmatter+finding keys == C2 (0 missing/extra); area == C3.
**Gate**: Phase 2 — MANDATORY C2 byte-diff done by orchestrator (matches), no invisible chars, no Claude P1 → Codex not required. PASSED.
**Unresolved risks**: P3 tests/fixtures must assert this exact grammar — any drift is a schema-contract break the Final cold-read must catch.

---

## Phase 3 — Collector core (TDD, Codex MANDATORY)
**Decisions**
- TDD split honored: test-author (3a) ≠ implementer (3b), distinct agents. 3a RED confirmed = 9 fails all `not implemented`, no module-load errors. 3b GREEN = 9/9.
- Codex gate ran clean (`codex exec ... < /dev/null` → `scripts/jig-retro/.codex-p3.md`). Note: macOS has no `timeout`; drop it and run codex directly.

**Synthesized contracts (pinned by the test file header — the 3b target)**
- `parseRetro(text) → {skill_version, repo, findings, skipped} | null` (null iff jig_retro!=="true"; missing-required-key finding dropped + counted in `skipped`; area coerced to C3; evidence_refs → string[]; generalizable:"false" kept — exclusion is dedupe's job).
- `fingerprint(area,change) → {fullHash(64hex), id(12hex)}`, `fullHash = sha256(area+"\n"+normalize(change))`. State keyed by fullHash; id display-only.
- `dedupe(findings, state, today?) → {newWork, state, newItems}`; newness at (fullHash×repo); generalizable!=="true" excluded; repos unioned; confidence maxed on new work.
- Confidence order low<medium<high.

**Deviations (from the plan, all sound)**
- Added optional `today` param to `dedupe` and `first_seen` rendering to `renderDigest` — C5's state schema mandates `first_seen` but the Phase 3 subagent prompts never mentioned it (a plan-internal C5-vs-prompt gap). The pure collector can't source dates, so `run.mjs` (Phase 4, the fs/date boundary) will pass `today`. Pure tests omit it → `first_seen` absent → not rendered. No test broke.

**Codex P1/P2 disposition**
- [P1] renderDigest repos insertion-order → FIXED: repos sorted before render; verified identical repo sets render byte-identically regardless of insertion order.
- [P2 ×5] triaged as spec-compliant or by-design: confidence-raise only on new work (per C5 newness), `id` is the grammar delimiter, single-quoted whole value is out-of-C2-grammar, evidence_refs malformed→[], observed_failure not in the C5 digest entry. No action.

**Green checkpoint**: `0738bfd` — `node --test scripts/jig-retro/` → 9 pass; determinism sanity (repos set order-invariance) → true.
**Gate**: Phase 3 Codex MANDATORY — 1 P1 fixed round 1, verified; no P1 survives. PASSED.
**Unresolved risks (→ Phase 4)**: run.mjs must (1) FORCE each finding's `repo` to the search-derived manifest value before dedupe (C2), (2) pass `today` so first_seen is stamped, (3) read untrusted retro bytes from files only (never shell-interpolated).

---

## Phase 4 — Deterministic scheduled workflow + dry-run (Codex MANDATORY)
**Decisions**
- All 3 Phase-3 handoff risks satisfied: run.mjs forces `f.repo = entry.repo` (C2), passes `today` (JIG_TODAY || Date), reads bytes via fs only. Verified by reading run.mjs.
- Dry-run uses `--seeded` mode (run once to build state, re-run same input → SILENT) — a real silent-when-empty proof without live GitHub.
- actionlint + PyYAML both absent (per plan, do not rely on them) → node text-assertion fallback validated 8 key strings.

**Synthesized contracts**
- CI scratch gitignored: `_retros/`, `digest-body.md`, `scripts/jig-retro/.dryrun-tmp/`. Committed initial state `.jig/retro-state.json = {"digest_issue":null,"seen":{}}`.
- Discovery uses `.repository.nameWithOwner` from `gh search` as the search-derived repo (C2). Overflow: COUNT==LIMIT(1000) → `DISCOVERY_TRUNCATED` + "⚠ discovery may be truncated" appended to digest body.
- Two-token split enforced: collect step = App token only (read); publish step = `github.token` only (write). Only GITHUB_TOKEN mention left is a comment.

**Deviations**: none from plan intent; P2 fixes tightened it.

**Codex P1/P2 disposition** (`scripts/jig-retro/.codex-p4.md`): No P1s.
- [P2] yml:46 dead `GH_TOKEN_READ` / implicit read boundary → FIXED: single clearly-commented App token in the read-only step; removed the unused var.
- [P2] yml:103 upsert could be hijacked by a spoofed exact-title issue → FIXED: prefer persisted `.jig/retro-state.json.digest_issue` (verified still OPEN + exact title) before falling back to title search, then create.

**Green checkpoint**: `2ca346e` — dry-run digest (contracts entry spans acme/repo-a+repo-b), seeded → `SILENT — nothing new` exit 0, 8/8 workflow key-asserts PASS, `node --test` 9 pass, fixtures/state unmutated by dry-run.
**Gate**: Phase 4 Codex MANDATORY — no P1; 2 P2s fixed + re-validated. PASSED.
**Unresolved risks (→ Final)**: confirm no dangling wikilinks now that all sub-files exist; cold-read the full loop; Codex final on whole diff; confirm plugins/ edits will trigger bump-plugin-version on merge.

---

## Final Quality Gate
**Automated checks**: (1) `node --test` → 9 pass; (2) dangling-wikilink scan over skills/jig/ → 0 (all 6 resolve); (3) invisible-char scan on build-journal.md + retro-template.md → clean; (6) plugin.json unchanged at 1.0.0 (bump-plugin-version handles the bump on merge — NOT hand-edited).

**Cold read (independent Agent, no prior context)**: VERDICT CLEAN. Verified NO schema drift on any critical axis (9 finding keys+order, area enum, generalizable/confidence values, ```yaml fence + quoting + indent rules all match retro-template.md↔collect.mjs). No broken references across produce→journal→handoff→retro→digest. Confirmed run.mjs forces search-derived repo before dedupe (C2 "repo advisory"). Noted the frontmatter-required-keys gap as safe-direction.

**Codex final (MANDATORY, whole diff, `.codex-final.md`)**: raised 5 P1 + 1 P2. Adjudicated vs pinned C2 (cross-model tension resolved on the contract, not by deferring):
- FIXED (3): all-5-frontmatter-keys required (C2); findings block anchored after `## Findings` (stray Summary ```yaml can't be data); generalizable/confidence validated vs C2 closed sets + confidence sanitized at render.
- REJECTED (2, contract-correct; cold-reader concurred): finding-key ORDER is authoring guidance not a parser gate; scalar first/last-quote is the C2-verbatim rule.
- P2 (App perms not narrowed in YAML): inherent — GitHub App perms are set at App creation (SETUP.md: Contents:read+Metadata:read), not settable in workflow code. No fix possible; documented.
- **Codex round 2** (`.codex-final2.md`) on the fixed collect.mjs: NO new P1/P2. No P1 survived 2 rounds.

**Green checkpoint**: `af54075` — 9 tests pass; targeted checks (missing-fm→null, stray-summary-yaml ignored, invalid-confidence skipped-and-counted) pass; dry-run digest + seeded SILENT intact.
**Gate**: Final — PASSED.

## Build complete
All 5 phases + final gate green. Success criteria 1–5 met (see retro). Retro written to `jig/review/20260701-jig-self-improvement-retro.md` — the first real input to the loop this build created.
