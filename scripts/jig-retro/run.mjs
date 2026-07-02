#!/usr/bin/env node
// jig-retro run — the ONLY fs boundary (Node built-ins only).
//
// Reads a manifest of fetched retro files + the current retro-state, parses each
// retro with the pure collector, FORCES each finding's repo to the manifest's
// search-derived value (C2: frontmatter repo is advisory and ignored), dedupes,
// and — only when there is new work — writes updated state + a rendered digest
// body. Untrusted retro bytes are read from disk here and NEVER shell-interpolated.
//
// Defaults: state=.jig/retro-state.json, manifest=_retros/manifest.json,
//           out=digest-body.md   (override with --state/--manifest/--out).

import fs from 'node:fs';
import path from 'node:path';
import { parseRetro, dedupe, renderDigest } from './collect.mjs';

const DEFAULT_STATE = { digest_issue: null, seen: {} };

function parseArgs(argv) {
  const out = {
    state: '.jig/retro-state.json',
    manifest: '_retros/manifest.json',
    out: 'digest-body.md',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--state') out.state = argv[++i];
    else if (a === '--manifest') out.manifest = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err && err.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw err;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const today = process.env.JIG_TODAY || new Date().toISOString().slice(0, 10);

  const manifestPath = path.resolve(args.manifest);
  const manifest = readJson(manifestPath, []);
  const state = readJson(path.resolve(args.state), DEFAULT_STATE);

  const allFindings = [];
  for (const entry of manifest) {
    // Untrusted bytes: read from disk, never interpolate into a shell.
    const text = fs.readFileSync(path.resolve(entry.file), 'utf8');
    const parsed = parseRetro(text);
    if (!parsed) continue;
    for (const f of parsed.findings) {
      // C2: force the search-derived repo; frontmatter repo is advisory.
      f.repo = entry.repo;
      allFindings.push(f);
    }
  }

  const result = dedupe(allFindings, state, today);

  if (result.newWork) {
    fs.writeFileSync(
      path.resolve(args.state),
      JSON.stringify(result.state, null, 2) + '\n',
    );
    fs.writeFileSync(path.resolve(args.out), renderDigest(result.state));
    process.stdout.write('NEW_WORK=true\n');
  } else {
    process.stdout.write('NEW_WORK=false\n');
  }
}

main();
