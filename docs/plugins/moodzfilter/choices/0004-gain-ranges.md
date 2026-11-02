# 0004 — Ranges of Gain in and Gain out

**Date**: 2026-11-02
**Status**: accepted (amends SPEC v1)

## Context

SPEC v1 set both gains to −24 to +24 dB. Maxime tried Gain out in Ableton Live after task 0003 (CI installer, run 41517663478): the gain works, but it never reaches silence and +24 dB (about ×16) saturates at once on a normal signal. The ranges must change before any release, while no published session depends on them.

## Options considered

1. Keep −24 to +24 dB for both.
2. Gain out −∞ to +12 dB, Gain in the same.
3. Gain out −∞ to +6 dB (enough to compensate a filter, little risk of clipping the output); Gain in −∞ to +12 dB (more headroom to push the drive).

## Decision

Option 3, chosen by Maxime on 2026-11-02. Both gains go down to silence: the lowest value of the control is displayed `-inf` and gives a gain of exactly 0. Gain out tops at +6 dB, Gain in at +12 dB. Default 0 dB for both, smoothed as before.

## Consequences

The SPEC table is amended. Task 0006 changes `gainOut` (same parameter ID, new range; no release exists, so no session to migrate beyond Maxime's test sessions, whose saved value may move). The golden references that use more than +6 dB (`gain-automation` goes to +12 dB) change, through a `golden:` commit approved by listening. Gain in gets its range when it is implemented.
