# jig-retro digest — setup runbook (HITL)

This workflow (`.github/workflows/jig-retro-digest.yml`) aggregates per-repo
`jig_retro` files across the `odyssey-core` org into ONE rolling GitHub issue in
this repo. It uses **two distinct tokens**:

- **Cross-repo READ** — a GitHub App installation token
  (`actions/create-github-app-token@v1`). The default `GITHUB_TOKEN` **cannot**
  read other org repos, so the App token is required for discovery + content fetch.
- **jig-repo WRITE** — the workflow's built-in `GITHUB_TOKEN` (`github.token`),
  used to create/edit the digest issue and commit the state file. **No extra
  write token is needed.**

The App token is read-only (Contents:read + Metadata:read); it is never used to
write. `GITHUB_TOKEN` is write-only here; it is never used to read other repos.

---

## Steps (all HITL — a human must do these once)

1. **[HITL] Create a GitHub App in the `odyssey-core` org.**
   - Org settings → Developer settings → GitHub Apps → **New GitHub App**.
   - Repository permissions: **Contents: Read-only** and **Metadata: Read-only**
     (Metadata is mandatory and auto-selected). No write permissions.
   - No webhook needed (uncheck "Active").

2. **[HITL] Generate the App's private key.**
   - On the App's page → **Private keys** → **Generate a private key**.
   - A `.pem` file downloads. Keep it secret; you will paste its full contents
     into a repo secret (step 5).

3. **[HITL] Install the App org-wide in `odyssey-core`.**
   - App page → **Install App** → choose `odyssey-core` → **All repositories**
     (org-wide install so discovery sees every repo with a retro).

4. **[HITL] Store the App ID as a repository variable.**
   - This repo → Settings → Secrets and variables → Actions → **Variables** tab →
     **New repository variable**: name `JIG_APP_ID`, value = the App's numeric
     **App ID** (from the App's General page).

5. **[HITL] Store the private key as a repository secret.**
   - Same page → **Secrets** tab → **New repository secret**: name
     `JIG_APP_PRIVATE_KEY`, value = the ENTIRE contents of the `.pem` file from
     step 2 (including the BEGIN/END lines).

6. **[HITL] Commit the initial state file.**
   - `.jig/retro-state.json` is committed as:
     ```json
     { "digest_issue": null, "seen": {} }
     ```
   - The workflow updates and commits this file over time. Leave it in place.

7. **[HITL] (Optional) Confirm write path.**
   - The publish step uses `GH_TOKEN: ${{ github.token }}` with the job's
     `permissions: { contents: write, issues: write }`. No further setup needed
     for writes — do **not** create a separate write PAT.

---

## Running it

- **Scheduled:** daily at `13:00 UTC` (cron `0 13 * * *`).
- **Manual:** Actions → **jig-retro digest** → **Run workflow**
  (`workflow_dispatch`).

## Behavior notes

- **Silent when empty:** if no new/changed generalizable findings are discovered,
  the collector prints `NEW_WORK=false` and the workflow makes no issue edit and
  no commit (exit 0).
- **Discovery truncation:** if `gh search code` returns exactly the page limit
  (1000), the run logs `DISCOVERY_TRUNCATED` and appends a
  `⚠ discovery may be truncated` line to the digest body.
- **Never** opens per-finding issues and **never** edits skill files — it only
  maintains the single `[jig-retro] Improvement digest` issue and the state file.

## Local dry-run (no live GitHub)

```
node scripts/jig-retro/dryrun.mjs            # first run -> prints digest body
node scripts/jig-retro/dryrun.mjs --seeded   # fully-seen state -> "SILENT — nothing new"
```

Set `JIG_TODAY=YYYY-MM-DD` to make `first_seen` stamps deterministic.
