// jig-retro collector contract tests (Phase 3a — TEST AUTHOR).
//
// These tests PIN the collector contract for the Phase 3b implementer. They are
// written to FAIL against the current stub (every collect.mjs function throws
// `not implemented`) and to PASS once 3b implements to the signatures below.
// Node built-ins only.
//
// ============================================================================
// PINNED SIGNATURES / RETURN SHAPES  (implement collect.mjs to exactly these)
// ============================================================================
//
// normalize(s: string) -> string
//   C4: NFC -> lowercase -> collapse whitespace runs to a single space -> trim
//   -> repeatedly strip trailing chars in {'.',',',';',':','!','?'} and any
//   trailing spaces revealed. e.g. normalize('  Pin  the API.  ') === 'pin the api'
//
// fingerprint(area: string, change: string) -> { fullHash, id }
//   fullHash = sha256(area + "\n" + normalize(change)) as lowercase hex (64 chars)
//   id       = fullHash.slice(0, 12)   (display only; state is keyed by fullHash)
//
// parseRetro(text: string) -> { skill_version, repo, findings, skipped } | null
//   - Returns null iff frontmatter `jig_retro` !== "true".
//   - skill_version, repo: strings taken from frontmatter (repo is advisory).
//   - findings: Finding[] in file order, EXCLUDING any finding that is missing a
//     required key (those are dropped). A Finding has ALL 9 C2 keys:
//       { id, area, plan_claim, observed_failure, orchestrator_workaround,
//         proposed_skill_change, evidence_refs, generalizable, confidence }
//     evidence_refs is a string[]; area is coerced to the C3 enum (unknown ->
//     "other"). generalizable:"false" findings ARE included here (dedupe, not
//     parseRetro, is what excludes them).
//   - skipped: integer count of findings dropped for a missing required key.
//
// dedupe(findings, state) -> { newWork, state, newItems }
//   - findings: array of finding-like objects, each carrying at least
//       { area, proposed_skill_change, generalizable, confidence, repo }.
//     The `repo` is the search-derived owner/name the collector attaches.
//   - state: prior state object { digest_issue, seen } where
//       seen[fullHash] = { area, proposed_skill_change, repos: string[], confidence }
//   - Only generalizable === "true" findings are eligible; others are excluded
//     entirely (never appear in newItems or the returned state.seen).
//   - Newness is at (fullHash x repo) granularity: a fullHash absent from seen,
//     OR present but whose repos[] does not include this finding's repo, is NEW.
//     Merging a new repo unions the repos and raises confidence to the max.
//   - Returns: newWork (boolean = newItems.length > 0), the updated state object,
//     and newItems (array of the entries that constituted new work).
//
// renderDigest(state) -> string
//   - Groups seen entries by C3 area order. Each entry shows proposed change as
//     inline `code`, repo count, repos, and max confidence. Untrusted values
//     (proposed_skill_change, repo) are whitespace-collapsed and have backticks /
//     control chars stripped before inline-code wrapping. Output is deterministic:
//     byte-identical across repeated calls on the same state.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { normalize, fingerprint, parseRetro, dedupe, renderDigest } from './collect.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dirname, 'fixtures');
const read = (...p) => readFileSync(join(FIX, ...p), 'utf8');

// C2 required finding keys.
const REQUIRED_KEYS = [
  'id', 'area', 'plan_claim', 'observed_failure', 'orchestrator_workaround',
  'proposed_skill_change', 'evidence_refs', 'generalizable', 'confidence',
];

// Known C4 fingerprints (computed with the exact normalize+sha256 rule).
const H_CONTRACTS = '330d56c195f45582160cca84e806be56d58de4e871339e60221c18ac0f551b14';
const H_TESTING   = 'cb9d8f8ccc85ad9bd69c81aa55b5de991e0022ecd712d5374c5e0702bbcc8520';
const H_OTHER     = '1cf9586589c6de85aee08b8a5de05d8babde7a891c0923f006356ea40821aec6';

// ---------------------------------------------------------------------------
// 1. parseRetro on a valid retro -> object with findings; all 9 keys present.
// ---------------------------------------------------------------------------
test('1. parseRetro(valid) returns {skill_version, repo, findings} with all 9 keys per finding', () => {
  const r = parseRetro(read('repo-A', 'jig', 'review', '20260701-a-retro.md'));
  assert.notStrictEqual(r, null);
  assert.strictEqual(r.skill_version, '1.4.0');
  assert.strictEqual(r.repo, 'acme/repo-a');
  assert.ok(Array.isArray(r.findings));
  assert.strictEqual(r.findings.length, 2);
  assert.strictEqual(r.skipped, 0);
  for (const f of r.findings) {
    for (const k of REQUIRED_KEYS) {
      assert.ok(Object.prototype.hasOwnProperty.call(f, k), `finding missing key ${k}`);
    }
    assert.ok(Array.isArray(f.evidence_refs), 'evidence_refs must be an array');
  }
  assert.strictEqual(r.findings[0].proposed_skill_change, 'Pin the full string contract');
});

// ---------------------------------------------------------------------------
// 2. parseRetro on jig_retro:"false" -> null.
// ---------------------------------------------------------------------------
test('2. parseRetro(jig_retro:"false") returns null', () => {
  const r = parseRetro(read('repo-D', 'jig', 'review', '20260701-d-skip-retro.md'));
  assert.strictEqual(r, null);
});

// ---------------------------------------------------------------------------
// 3. Unknown area coerced to "other".
// ---------------------------------------------------------------------------
test('3. parseRetro coerces an unknown area to "other"', () => {
  const r = parseRetro(read('repo-C', 'jig', 'review', '20260701-c-retro.md'));
  assert.notStrictEqual(r, null);
  assert.strictEqual(r.findings.length, 1);
  assert.strictEqual(r.findings[0].area, 'other');
});

// ---------------------------------------------------------------------------
// 4. Missing required key -> finding omitted AND counted in `skipped`.
// ---------------------------------------------------------------------------
test('4. parseRetro drops a finding missing a required key and reports skipped count', () => {
  const r = parseRetro(read('repo-E', 'jig', 'review', '20260701-e-retro.md'));
  assert.notStrictEqual(r, null);
  // repo-E has F1 (valid, generalizable:"false") and F2 (missing proposed_skill_change).
  assert.strictEqual(r.findings.length, 1);
  assert.strictEqual(r.findings[0].id, 'F1');
  assert.strictEqual(r.skipped, 1);
});

// ---------------------------------------------------------------------------
// 5. normalize contract.
// ---------------------------------------------------------------------------
test('5. normalize("  Pin  the API.  ") === "pin the api"', () => {
  assert.strictEqual(normalize('  Pin  the API.  '), 'pin the api');
});

// ---------------------------------------------------------------------------
// 6. fingerprint stability across normalize-equivalent strings; id is 12 hex.
// ---------------------------------------------------------------------------
test('6. fingerprint collapses normalize-equivalent changes to the same id/fullHash', () => {
  const a = fingerprint('contracts', 'Pin the full string contract');
  const b = fingerprint('contracts', '  Pin the full string   contract.  '); // repo-B raw value
  assert.strictEqual(a.fullHash, b.fullHash);
  assert.strictEqual(a.id, b.id);
  assert.strictEqual(a.id.length, 12);
  assert.strictEqual(a.fullHash, H_CONTRACTS);
  assert.strictEqual(a.id, H_CONTRACTS.slice(0, 12));
  assert.strictEqual(a.id, '330d56c195f4');
});

// ---------------------------------------------------------------------------
// 7. dedupe: same-repo re-encounter not new; same fullHash new repo is new work
//    (repos merged, confidence maxed); brand-new fullHash is new; a
//    generalizable:"false" finding never appears.
// ---------------------------------------------------------------------------
test('7. dedupe newness at (fullHash x repo) granularity; generalizable:"false" excluded', () => {
  const state = JSON.parse(read('seen.json')); // seen = { H_CONTRACTS: repos ["acme/repo-a"], conf "medium" }

  const findings = [
    // Same fullHash + same repo as seen -> NOT new.
    { area: 'contracts', proposed_skill_change: 'Pin the full string contract',
      generalizable: 'true', confidence: 'medium', repo: 'acme/repo-a' },
    // Same fullHash, NEW repo -> new work; merge repos, raise confidence to "high".
    { area: 'contracts', proposed_skill_change: '  Pin the full string   contract.  ',
      generalizable: 'true', confidence: 'high', repo: 'acme/repo-b' },
    // generalizable:"false" -> excluded entirely.
    { area: 'handoff', proposed_skill_change: "None generalizable; note it in this repo's own docs",
      generalizable: 'false', confidence: 'low', repo: 'acme/repo-e' },
    // Brand-new fullHash -> new work.
    { area: 'other', proposed_skill_change: 'Something about deployment gates',
      generalizable: 'true', confidence: 'low', repo: 'acme/repo-c' },
  ];

  const out = dedupe(findings, state);

  assert.strictEqual(out.newWork, true);
  assert.strictEqual(out.newItems.length, 2); // repo-b merge + repo-c brand-new

  // Contracts fingerprint now spans both repos, confidence raised to the max.
  const c = out.state.seen[H_CONTRACTS];
  assert.deepStrictEqual([...c.repos].sort(), ['acme/repo-a', 'acme/repo-b']);
  assert.strictEqual(c.confidence, 'high');

  // Brand-new fingerprint recorded.
  assert.ok(out.state.seen[H_OTHER], 'brand-new fullHash must be added to state.seen');
  assert.deepStrictEqual(out.state.seen[H_OTHER].repos, ['acme/repo-c']);

  // The generalizable:"false" finding is nowhere.
  const handoffFp = fingerprint('handoff', "None generalizable; note it in this repo's own docs");
  assert.strictEqual(out.state.seen[handoffFp.fullHash], undefined);
  for (const item of out.newItems) {
    assert.notStrictEqual(item.area, 'handoff');
  }
});

// ---------------------------------------------------------------------------
// 8. renderDigest: grouped by C3 area order; inline-code change + repo count +
//    repos + max confidence; untrusted values sanitized; deterministic output.
// ---------------------------------------------------------------------------
test('8. renderDigest groups by area order, sanitizes untrusted values, is deterministic', () => {
  const state = {
    digest_issue: null,
    seen: {
      [H_CONTRACTS]: { area: 'contracts', proposed_skill_change: 'Pin the full string contract',
        repos: ['acme/repo-a', 'acme/repo-b'], confidence: 'high' },
      [H_TESTING]: { area: 'testing', proposed_skill_change: 'Add a contract test for external API shapes',
        repos: ['acme/repo-a'], confidence: 'high' },
      // Untrusted value carrying a backtick and a newline.
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff':
        { area: 'other', proposed_skill_change: 'bad`tick\nand newline',
          repos: ['acme/repo-z'], confidence: 'low' },
    },
  };

  const out = renderDigest(state);
  assert.strictEqual(typeof out, 'string');

  // Deterministic: byte-identical across two calls.
  assert.strictEqual(renderDigest(state), renderDigest(state));

  // Proposed change rendered as inline code.
  assert.ok(out.includes('`Pin the full string contract`'), 'change should be inline-code wrapped');

  // Repos and repo count shown.
  assert.ok(out.includes('acme/repo-a'));
  assert.ok(out.includes('acme/repo-b'));
  assert.ok(out.includes('2'), 'repo count should be shown');

  // Max confidence shown.
  assert.ok(out.includes('high'));

  // Grouped by C3 area order: contracts before testing before other.
  const iContracts = out.indexOf('Pin the full string contract');
  const iTesting = out.indexOf('Add a contract test');
  const iOther = out.indexOf('badtick and newline');
  assert.ok(iContracts >= 0 && iTesting >= 0 && iOther >= 0);
  assert.ok(iContracts < iTesting, 'contracts area must render before testing');
  assert.ok(iTesting < iOther, 'testing area must render before other');

  // Untrusted value sanitized: backtick stripped, newline collapsed to a space.
  assert.ok(out.includes('badtick and newline'), 'value should be whitespace-collapsed, backtick-stripped');
  assert.ok(!out.includes('bad`tick'), 'raw backtick must not survive in output');
});

// ---------------------------------------------------------------------------
// 9. No-new-work: a seen map that already contains every fixture hash+repo
//    yields no new items (drives silent-when-empty).
// ---------------------------------------------------------------------------
test('9. dedupe over a fully-seen state yields no new work', () => {
  const state = {
    digest_issue: null,
    seen: {
      [H_CONTRACTS]: { area: 'contracts', proposed_skill_change: 'Pin the full string contract',
        repos: ['acme/repo-a', 'acme/repo-b'], confidence: 'high' },
      [H_TESTING]: { area: 'testing', proposed_skill_change: 'Add a contract test for external API shapes',
        repos: ['acme/repo-a'], confidence: 'high' },
      [H_OTHER]: { area: 'other', proposed_skill_change: 'Something about deployment gates',
        repos: ['acme/repo-c'], confidence: 'low' },
    },
  };

  const findings = [
    { area: 'contracts', proposed_skill_change: 'Pin the full string contract',
      generalizable: 'true', confidence: 'medium', repo: 'acme/repo-a' },
    { area: 'contracts', proposed_skill_change: '  Pin the full string   contract.  ',
      generalizable: 'true', confidence: 'high', repo: 'acme/repo-b' },
    { area: 'testing', proposed_skill_change: 'Add a contract test for external API shapes',
      generalizable: 'true', confidence: 'high', repo: 'acme/repo-a' },
    { area: 'other', proposed_skill_change: 'Something about deployment gates',
      generalizable: 'true', confidence: 'low', repo: 'acme/repo-c' },
  ];

  const out = dedupe(findings, state);
  assert.strictEqual(out.newWork, false);
  assert.strictEqual(out.newItems.length, 0);
});
