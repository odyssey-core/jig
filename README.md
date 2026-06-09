# jig

A precision tool that guides the build. **Jig** turns a well-defined spec into an
engineering-ready implementation plan with embedded build discipline — TDD structure,
subagent orchestration, quality gates, and safety rails — detailed enough that a fresh
Claude Code session can read it and build autonomously. It can also audit an existing
plan against the build-discipline patterns.

Named after the machining jig: a precision tool that guides other tools. The plan *is*
the jig — it makes every cut repeatable and accurate.

## Install

```bash
/plugin install jig@grimoire
```

(Requires the grimoire marketplace: `/plugin marketplace add odyssey-core/grimoire`.)

## Usage

- `/jig` — **Produce mode** (default): create a new implementation plan from a spec.
- `/jig review` — **Review mode**: audit an existing plan against the build-discipline
  patterns and report a readiness score.

Jig assumes you already have a reasonably well-defined idea or spec (a design doc,
brainstorm output, or a clear feature request). Its job starts when you know *what* to
build and need to lock in *how*.

## Companion

`loop-god` — an optional companion skill for shaping non-obvious loops into a Loop
Contract. Jig works fully on its own and uses loop-god's output when it's installed.
Coming to the grimoire marketplace soon.
