# 0002 — Reuse before coding, RTSan for real time

**Date**: 2026-11-02
**Status**: accepted

## Context

Explicit request: anything we can avoid coding ourselves is a gain. The playbook planned a homemade instrumented allocator to detect allocations on the audio thread.

## Options considered

1. Code the generic building blocks (presets, FIFO, modulation matrix, allocation detection).
2. Take existing building blocks, respecting the plugin's license.

## Decision

Option 2: take existing building blocks, with the selection rule of `docs/07_REUSE.md` (JUCE, then MIT/BSD, then GPL if AGPL, then our own code), added as rule 8 of `.claude/rules/scope.md`. Real-time detection goes through RealtimeSanitizer (clang) instead of a homemade allocator.

## Consequences

Less code to maintain. Each dependency has a pinned version and a line in the project's `docs/DEPENDENCIES.md`. The plugin's license becomes the first decision to make, since it determines what we can take.
