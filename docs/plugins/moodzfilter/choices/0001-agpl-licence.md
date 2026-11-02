# 0001 — MoodzFilter under the AGPL v3 licence

**Date**: 2026-11-02
**Status**: accepted

## Context

The licence determines what we are allowed to reuse (`docs/07_REUSE.md` in the playbook). The plugin is first of all for Maxime's productions, with no plan to sell it.

## Options considered

1. Closed / commercial: only MIT, BSD, Apache; commercial JUCE licence.
2. Open source AGPL v3: in addition, all GPL v3 code (sst-filters, sst-waveshapers, chowdsp GPL, OB-Xf).

## Decision

Option 2: MoodzFilter is open source under AGPL v3. The plugin's code is public under AGPL v3, and JUCE is used under its AGPL v3 licence.

## Consequences

We can plug in sst-filters and OB-Xf's ZDF filter instead of coding them. Each GPL library reused gets a line in the plugin's `docs/DEPENDENCIES.md`. A version sold later would require removing all GPL code and a commercial JUCE licence: this is a costly decision to undo.
