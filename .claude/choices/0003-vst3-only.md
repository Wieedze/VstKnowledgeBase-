# 0003 — VST3 only

**Date**: 2026-11-02
**Status**: accepted

## Context

Pamplejuce builds Standalone, AU, AUv3, VST3 and CLAP by default. Each format adds build, signing, packaging and test cases, while pluginval only validates the VST3 in the template's CI.

## Options considered

1. Keep all the template's formats.
2. VST3 + Standalone (+ AU on macOS), the playbook's initial decision.
3. VST3 only.

## Decision

Option 3, explicitly requested: `FORMATS VST3`. The other formats are removed from CMake, CI and installers. Debugging outside a DAW goes through JUCE's AudioPluginHost. Any other format goes into `FUTURE.md` and leaves it only through a new ADR.

## Consequences

A single format to build, sign, validate and support. No AU: Logic Pro is not covered. TetraDrive's sample accurate automation patch, specific to the VST3 wrapper, applies to 100 % of user cases.
