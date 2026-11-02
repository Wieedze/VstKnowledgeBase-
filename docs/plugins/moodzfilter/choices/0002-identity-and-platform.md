# 0002 — Plugin identity and platform

**Date**: 2026-11-02
**Status**: proposed (the codes become final at the first build loaded in a DAW, in phase 1)

## Context

JUCE requires a product name, a manufacturer name and two 4-character codes. Once a session is saved in a DAW, changing a code breaks the reloading of the session.

## Options considered

The proposal below is the only option recorded. The open point is `COMPANY_NAME`: Moodz, Radikal Moodz or another name.

## Decision

The proposed identity is MoodzFilter by Moodz, codes `Mood` and `Mzf1`, VST3 only, Windows only for v1.

| CMake field | Proposed value |
| --- | --- |
| `PRODUCT_NAME` | MoodzFilter |
| `COMPANY_NAME` | Moodz |
| `PLUGIN_MANUFACTURER_CODE` | `Mood` |
| `PLUGIN_CODE` | `Mzf1` |
| `FORMATS` | `VST3` |
| `IS_SYNTH` | `FALSE` |
| `NEEDS_MIDI_INPUT` | `FALSE` |
| v1 platform | Windows only; CI keeps a Linux job for the tests and RealtimeSanitizer |

## Consequences

No Apple signing or notarisation to plan for in v1. The Linux job remains necessary, because RealtimeSanitizer does not run on Windows. To validate before phase 1: `COMPANY_NAME` (Moodz, Radikal Moodz or other).
