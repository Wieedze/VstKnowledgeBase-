# 0003 — Format of the golden references and their manifest

**Date**: 2026-11-02
**Status**: accepted

## Context

Task 0004 adds `MoodzFilterTools compare`, which checks renders against references kept in `tests/golden/`. The playbook left the exact format of `tests/golden/manifest.json` as an open question. The references must stay small enough for git, compare exactly what the plugin produces, and never be skipped silently.

## Options considered

1. No manifest: compare every WAV found in both folders with one global tolerance. Simple, but a missing or extra file goes unnoticed, and a future filter model cannot get a looser tolerance than the gain.
2. A manifest listing every reference, with default tolerances and optional per-file overrides.
3. Store hashes instead of audio. Smallest, but any 1-ulp difference between Linux and Windows fails, and nobody can listen to a hash.

## Decision

Option 2. References are 32-bit float stereo WAV files at 48 kHz, named `<case>__<signal>.wav`, rendered by `MoodzFilterTools render` with blocks of 512 samples. `tests/golden/manifest.json` reads:

```json
{
  "format": 1,
  "sampleRate": 48000,
  "defaults": { "maxAbsError": 1e-6, "maxRmsErrorDbfs": -120 },
  "files": { "unity__impulse.wav": {}, "gain-plus6__sweep.wav": { "maxAbsError": 1e-5 } }
}
```

A file passes when, on every channel, the largest absolute sample difference is at most `maxAbsError` and the RMS of the difference, in dBFS, is at most `maxRmsErrorDbfs`. `compare` fails when a listed file is missing on either side, when a WAV in either folder is not listed, or when the channel count, length or sample rate differ. A per-file entry overrides the defaults; an empty object takes them.

## Consequences

Adding a render case or a signal means adding its files to the manifest in a `golden:` commit, approved by listening. Filters and drive will likely need per-file tolerances because of cross-platform floating point; they get them explicitly, file by file. The references weigh about 200 kB per second of stereo audio, so cases stay short (the first set is 2.4 MB). If the set grows past a few tens of MB, Git LFS becomes a separate decision.
