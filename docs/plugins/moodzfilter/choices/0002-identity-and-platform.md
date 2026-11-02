# 0002 — Plugin identity and platform

**Date**: 2026-11-02
**Status**: accepted (the codes become final at the first build loaded in a DAW, in phase 1)

## Context

JUCE requires a product name, a manufacturer name and two 4-character codes. Once a session is saved in a DAW, changing a code breaks the reloading of the session.

## Options considered

1. Manufacturer `Moodz`, code `Mood`: short, matches the plugin name.
2. Manufacturer `Radikal Moodz`, code `Rdkm`: Maxime's artist name.
3. Manufacturer `Wieedze` or `Transubtil`: developer handle or the label.

## Decision

MoodzFilter by Radikal Moodz, manufacturer code `Rdkm`, plugin code `Mzf1`, VST3 only, Windows only for v1.

| CMake field | Value |
| --- | --- |
| `PRODUCT_NAME` | MoodzFilter |
| `COMPANY_NAME` | Radikal Moodz |
| `PLUGIN_MANUFACTURER_CODE` | `Rdkm` |
| `PLUGIN_CODE` | `Mzf1` |
| `FORMATS` | `VST3` |
| `IS_SYNTH` | `FALSE` |
| `NEEDS_MIDI_INPUT` | `FALSE` |
| v1 platform | Windows only; CI keeps a Linux job for the tests and RealtimeSanitizer |

## Consequences

The plugin shows up in Ableton under "Radikal Moodz". Later plugins by the same maker reuse `Rdkm` and take their own plugin code. No Apple signing or notarisation to plan for in v1. The Linux job remains necessary, because RealtimeSanitizer does not run on Windows. Once a Live session is saved with the plugin, none of these codes may change.
