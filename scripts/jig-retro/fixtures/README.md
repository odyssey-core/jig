# jig-retro fixtures

Test fixtures for the retro collector (`../collect.mjs`), consumed by
`../collect.test.mjs`. The collector walks a set of repos and reads their per-repo
retro files, so the fixture layout mirrors that on-disk shape. Every `*-retro.md`
conforms to Contract C2 (see `plugins/jig/skills/jig/retro-template.md`).

## Layout

```
fixtures/
  repo-A/jig/review/20260701-a-retro.md   # jig_retro true; TWO eligible findings
  repo-B/jig/review/20260701-b-retro.md   # jig_retro true; ONE finding, cross-repo fingerprint match with repo-A F1
  repo-C/jig/review/20260701-c-retro.md   # jig_retro true; finding with area OUTSIDE the C3 enum -> coerce to "other"
  repo-D/jig/review/20260701-d-skip-retro.md  # jig_retro "false" -> parseRetro returns null (skipped)
  repo-E/jig/review/20260701-e-retro.md   # generalizable:"false" finding (excluded) + finding missing a key (skipped+counted)
  seen.json                               # prior collector state {digest_issue, seen:{...}}
```

Each top-level directory under `fixtures/` stands in for a repo the collector
scans; the search-derived repo identity used in tests is `acme/repo-a`,
`acme/repo-b`, etc. (frontmatter `repo` matches, but is advisory only).

## Eligible findings and their C4 fingerprints

`fullHash = sha256(area + "\n" + normalize(proposed_skill_change))`, `id = fullHash.slice(0,12)`.
Only `generalizable:"true"` findings are eligible for dedupe.

| source | area (post-coercion) | normalize(change) | repo | fullHash (id) |
|--------|----------------------|-------------------|------|----------------|
| repo-A F1 | `contracts` | `pin the full string contract` | acme/repo-a | `330d56c195f4...` |
| repo-B F1 | `contracts` | `pin the full string contract` | acme/repo-b | `330d56c195f4...` (SAME as repo-A F1) |
| repo-A F2 | `testing`   | `add a contract test for external api shapes` | acme/repo-a | `cb9d8f8ccc85...` |
| repo-C F1 | `other` (coerced from `deployment`) | `something about deployment gates` | acme/repo-c | `1cf9586589c6...` |

repo-A F1 and repo-B F1 differ only by trailing punctuation / case / whitespace in
`proposed_skill_change`, so `normalize()` collapses them to the same string and
they share one `fullHash`.

Full hashes:

- `contracts`  -> `330d56c195f45582160cca84e806be56d58de4e871339e60221c18ac0f551b14`
- `testing`    -> `cb9d8f8ccc85ad9bd69c81aa55b5de991e0022ecd712d5374c5e0702bbcc8520`
- `other`      -> `1cf9586589c6de85aee08b8a5de05d8babde7a891c0923f006356ea40821aec6`

## Non-eligible / edge findings

- **repo-D**: `jig_retro:"false"` -> `parseRetro` returns `null`; nothing from it reaches dedupe.
- **repo-E F1**: `generalizable:"false"` -> structurally valid, present in `parseRetro().findings`, but EXCLUDED by `dedupe`.
- **repo-E F2**: missing the required `proposed_skill_change` key -> dropped by `parseRetro` and reflected in `parseRetro().skipped` (count = 1 for repo-E).

## seen.json

Prior collector state. Holds ONE already-seen fingerprint,
`330d56c195f4...` (= repo-A F1 `contracts` / `pin the full string contract`), with
`repos: ["acme/repo-a"]` only. Therefore:

- Re-encountering that fingerprint from **acme/repo-a** is NOT new work.
- Encountering the SAME fingerprint from **acme/repo-b** IS new work (new repo ->
  union repos to `["acme/repo-a","acme/repo-b"]`, raise confidence to the max of
  the two).
