// jig-retro collect — pure collector core (Node built-ins only).
// Named exports stay stable so downstream tests import them cleanly.
// No fs / no network here: run.mjs (Phase 4) is the fs boundary.

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// C3 area enum + ordering.
// ---------------------------------------------------------------------------
const AREAS = [
  'subagents', 'contracts', 'testing', 'sequencing', 'handoff',
  'ownership', 'review', 'honesty', 'other',
];
const AREA_SET = new Set(AREAS);
const AREA_ORDER = new Map(AREAS.map((a, i) => [a, i]));

const CONFIDENCE_ORDER = { low: 0, medium: 1, high: 2 };

const REQUIRED_KEYS = [
  'id', 'area', 'plan_claim', 'observed_failure', 'orchestrator_workaround',
  'proposed_skill_change', 'evidence_refs', 'generalizable', 'confidence',
];

const TRAILING_PUNCT = new Set(['.', ',', ';', ':', '!', '?']);

// ---------------------------------------------------------------------------
// C4: normalize.
// ---------------------------------------------------------------------------
export function normalize(s) {
  let out = String(s)
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  // Repeatedly strip trailing punctuation and the spaces it reveals.
  let i = out.length;
  while (i > 0) {
    const ch = out[i - 1];
    if (ch === ' ' || TRAILING_PUNCT.has(ch)) {
      i--;
    } else {
      break;
    }
  }
  return out.slice(0, i);
}

// ---------------------------------------------------------------------------
// C4: fingerprint.
// ---------------------------------------------------------------------------
export function fingerprint(area, change) {
  const fullHash = createHash('sha256')
    .update(area + '\n' + normalize(change))
    .digest('hex');
  return { fullHash, id: fullHash.slice(0, 12) };
}

// ---------------------------------------------------------------------------
// Frontmatter: parse simple `key: value` pairs between the first two `---`.
// ---------------------------------------------------------------------------
function unquote(v) {
  const t = v.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1);
    }
  }
  return t;
}

function parseFrontmatter(text) {
  const lines = text.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '---') { start = i; break; }
  }
  if (start === -1) return null;
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === '---') { end = i; break; }
  }
  if (end === -1) return null;

  const fm = {};
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    fm[key] = unquote(line.slice(idx + 1));
  }
  return fm;
}

// ---------------------------------------------------------------------------
// Findings block extraction: first ```yaml ... ``` fence at column 0.
// ---------------------------------------------------------------------------
function extractFindingsBlock(text) {
  const lines = text.split('\n');
  let open = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '```yaml') { open = i; break; }
  }
  if (open === -1) return null;
  let close = -1;
  for (let i = open + 1; i < lines.length; i++) {
    if (lines[i] === '```') { close = i; break; }
  }
  if (close === -1) return null;
  return lines.slice(open + 1, close);
}

// Extract a scalar value: text between the FIRST `"` after the colon and the
// LAST `"` on the line. Returns undefined if no closing quote (malformed).
function scalarValue(rest) {
  const first = rest.indexOf('"');
  if (first === -1) return undefined;
  const last = rest.lastIndexOf('"');
  if (last === first) return undefined; // no closing quote
  return rest.slice(first + 1, last);
}

// Parse a single-line inline array ["a","b"] -> string[].
function arrayValue(rest) {
  const re = /"([^"]*)"/g;
  const out = [];
  let m;
  while ((m = re.exec(rest)) !== null) {
    out.push(m[1]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// C2: parseRetro.
// ---------------------------------------------------------------------------
export function parseRetro(text) {
  const fm = parseFrontmatter(text);
  if (!fm || fm.jig_retro !== 'true') return null;

  const skill_version = fm.skill_version;
  const repo = fm.repo;

  const block = extractFindingsBlock(text);
  const findings = [];
  let skipped = 0;

  if (block) {
    let current = null;      // in-progress finding object
    let malformed = false;   // current finding hit a bad line

    const flush = () => {
      if (current === null) return;
      if (malformed) {
        skipped++;
      } else {
        // Require all 9 keys present.
        const hasAll = REQUIRED_KEYS.every(
          (k) => Object.prototype.hasOwnProperty.call(current, k),
        );
        if (!hasAll) {
          skipped++;
        } else {
          if (!AREA_SET.has(current.area)) current.area = 'other';
          findings.push(current);
        }
      }
      current = null;
      malformed = false;
    };

    for (const raw of block) {
      // New finding: 2-space indent, `- id:` first.
      const idMatch = /^ {2}- id:(.*)$/.exec(raw);
      if (idMatch) {
        flush();
        current = {};
        malformed = false;
        const v = scalarValue(idMatch[1]);
        if (v === undefined) {
          malformed = true;
        } else {
          current.id = v;
        }
        continue;
      }

      // Subsequent key line: 4-space indent.
      const kvMatch = /^ {4}([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(raw);
      if (kvMatch && current !== null) {
        const key = kvMatch[1];
        const rest = kvMatch[2];
        if (key === 'evidence_refs') {
          current[key] = arrayValue(rest);
        } else {
          const v = scalarValue(rest);
          if (v === undefined) {
            malformed = true;
          } else {
            current[key] = v;
          }
        }
        continue;
      }
      // Any other line (e.g. `findings:`) is ignored.
    }
    flush();
  }

  return { skill_version, repo, findings, skipped };
}

// ---------------------------------------------------------------------------
// C5: dedupe.
// ---------------------------------------------------------------------------
function cloneState(state) {
  const seen = {};
  const src = (state && state.seen) || {};
  for (const [k, v] of Object.entries(src)) {
    seen[k] = {
      area: v.area,
      proposed_skill_change: v.proposed_skill_change,
      repos: Array.isArray(v.repos) ? [...v.repos] : [],
      confidence: v.confidence,
      ...(v.first_seen !== undefined ? { first_seen: v.first_seen } : {}),
    };
  }
  return { digest_issue: state ? state.digest_issue : null, seen };
}

function maxConfidence(a, b) {
  const oa = CONFIDENCE_ORDER[a] ?? -1;
  const ob = CONFIDENCE_ORDER[b] ?? -1;
  return ob > oa ? b : a;
}

export function dedupe(findings, state, today) {
  const next = cloneState(state);
  const newItems = [];

  for (const f of findings || []) {
    if (f.generalizable !== 'true') continue;

    const { fullHash } = fingerprint(f.area, f.proposed_skill_change);
    const entry = next.seen[fullHash];

    if (!entry) {
      const created = {
        area: f.area,
        proposed_skill_change: f.proposed_skill_change,
        repos: [f.repo],
        confidence: f.confidence,
        // C5: first_seen is stamped by the fs boundary (run.mjs passes `today`).
        // The pure collector omits it when no date is supplied.
        ...(today !== undefined ? { first_seen: today } : {}),
      };
      next.seen[fullHash] = created;
      newItems.push(created);
    } else if (!entry.repos.includes(f.repo)) {
      entry.repos.push(f.repo);
      entry.confidence = maxConfidence(entry.confidence, f.confidence);
      newItems.push(entry);
    }
    // else: same fullHash + same repo -> not new work.
  }

  return { newWork: newItems.length > 0, state: next, newItems };
}

// ---------------------------------------------------------------------------
// C5: renderDigest (injection-safe, deterministic).
// ---------------------------------------------------------------------------
function sanitize(s) {
  return String(s)
    // Remove control chars (incl. newlines/tabs) first.
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    // Remove backticks.
    .replace(/`/g, '')
    // Collapse whitespace runs.
    .replace(/\s+/g, ' ')
    .trim();
}

function inlineCode(s) {
  return '`' + sanitize(s) + '`';
}

export function renderDigest(state) {
  const seen = (state && state.seen) || {};
  const entries = Object.entries(seen).map(([fullHash, v]) => ({ fullHash, v }));

  entries.sort((x, y) => {
    const ax = AREA_ORDER.has(x.v.area) ? AREA_ORDER.get(x.v.area) : AREAS.length;
    const ay = AREA_ORDER.has(y.v.area) ? AREA_ORDER.get(y.v.area) : AREAS.length;
    if (ax !== ay) return ax - ay;
    return x.fullHash < y.fullHash ? -1 : x.fullHash > y.fullHash ? 1 : 0;
  });

  const lines = ['# jig-retro digest', ''];
  let lastArea = null;
  for (const { v } of entries) {
    const area = AREA_SET.has(v.area) ? v.area : 'other';
    if (area !== lastArea) {
      lines.push(`## ${area}`);
      lines.push('');
      lastArea = area;
    }
    const change = inlineCode(v.proposed_skill_change);
    // Canonical repo order: identical repo SETS must render byte-identically
    // regardless of the discovery/insertion order they were persisted in (P1).
    const sortedRepos = [...(v.repos || [])].sort();
    const repos = sortedRepos.map((r) => inlineCode(r)).join(', ');
    const count = sortedRepos.length;
    const firstSeen = v.first_seen ? ` — first_seen: ${v.first_seen}` : '';
    lines.push(`- ${change} — repos: ${count} (${repos}) — confidence: ${v.confidence}${firstSeen}`);
  }
  lines.push('');
  return lines.join('\n');
}
