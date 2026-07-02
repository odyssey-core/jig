#!/usr/bin/env node
// jig-retro dryrun — exercises run.mjs against the committed fixtures with NO
// live GitHub. Builds a manifest from scripts/jig-retro/fixtures/, points run.mjs
// at a TEMP state (never the committed .jig/retro-state.json), and prints either
// the rendered digest body (first run, empty state) or "SILENT — nothing new"
// (second run against a fully-seen state).
//
// Usage:
//   node dryrun.mjs            # first run: empty state -> prints digest body
//   node dryrun.mjs --seeded   # seeds state from a first run, then re-runs
//                              #   the same input -> SILENT (no new work)
//
// Search-derived repo stand-in: dir `repo-A` -> `acme/repo-a` (matches
// fixtures/README.md). Temp artifacts live under .dryrun-tmp/ (gitignored) and
// are recreated fresh each run. The committed fixtures are read-only here.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const TMP = path.join(HERE, '.dryrun-tmp');
const RUN = path.join(HERE, 'run.mjs');
const EMPTY_STATE = { digest_issue: null, seen: {} };

const seeded = process.argv.slice(2).includes('--seeded');

// Walk fixtures/repo-*/jig/review/*-retro.md -> manifest entries.
function buildManifest() {
  const entries = [];
  const dirs = fs
    .readdirSync(FIXTURES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^repo-/i.test(d.name))
    .map((d) => d.name)
    .sort();
  let n = 0;
  for (const dir of dirs) {
    const reviewDir = path.join(FIXTURES, dir, 'jig', 'review');
    if (!fs.existsSync(reviewDir)) continue;
    const retros = fs
      .readdirSync(reviewDir)
      .filter((f) => f.endsWith('-retro.md'))
      .sort();
    for (const rf of retros) {
      n++;
      // Copy the untrusted retro bytes into _retros/{n}.md (mirrors CI).
      const dest = path.join(TMP, '_retros', `${n}.md`);
      fs.copyFileSync(path.join(reviewDir, rf), dest);
      entries.push({
        repo: `acme/${dir.toLowerCase()}`, // search-derived stand-in
        path: `${dir}/jig/review/${rf}`,
        file: `_retros/${n}.md`,
      });
    }
  }
  return entries;
}

function runOnce() {
  return spawnSync(
    process.execPath,
    [RUN, '--state', 'state.json', '--manifest', '_retros/manifest.json', '--out', 'digest-body.md'],
    {
      cwd: TMP,
      env: { ...process.env },
      encoding: 'utf8',
    },
  );
}

function main() {
  // Fresh temp dir every run so nothing leaks between modes.
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(path.join(TMP, '_retros'), { recursive: true });

  const manifest = buildManifest();
  fs.writeFileSync(
    path.join(TMP, '_retros', 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(TMP, 'state.json'),
    JSON.stringify(EMPTY_STATE, null, 2) + '\n',
  );

  // First run against the empty state.
  const first = runOnce();
  if (first.status !== 0) {
    process.stderr.write(first.stderr || 'run.mjs failed\n');
    process.exit(1);
  }

  if (!seeded) {
    // Empty state -> everything is new work; print the digest body.
    const body = fs.readFileSync(path.join(TMP, 'digest-body.md'), 'utf8');
    process.stdout.write(body.endsWith('\n') ? body : body + '\n');
    return;
  }

  // Seeded mode: state.json is now fully seen. Re-run the SAME input.
  const second = runOnce();
  if (second.status !== 0) {
    process.stderr.write(second.stderr || 'run.mjs failed\n');
    process.exit(1);
  }
  if (second.stdout.includes('NEW_WORK=false')) {
    process.stdout.write('SILENT — nothing new\n');
  } else {
    process.stderr.write('UNEXPECTED: second run reported new work\n' + second.stdout);
    process.exit(1);
  }
}

main();
