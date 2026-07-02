# jig-retro fixtures

Test fixtures for the retro collector. The collector walks a set of repos and reads
their per-repo retro files, so the fixture layout mirrors that on-disk shape.

## Intended layout

```
fixtures/
  <repo-name>/
    jig/
      review/
        <YYYYMMDD>-<slug>-retro.md   # one structured retro per build/session
  <another-repo>/
    jig/
      review/
        <YYYYMMDD>-<slug>-retro.md
```

- Each top-level directory under `fixtures/` stands in for a repo the collector scans.
- Within a repo, retro files live at `jig/review/*-retro.md`.
- Each `*-retro.md` follows the structured retro template (parsed by `parseRetro`).

Fixtures are added alongside the tests that consume them in later phases (P1/P2).
