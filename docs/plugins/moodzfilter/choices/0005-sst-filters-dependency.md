# 0005 — sst-filters as the filter library of the dsp layer

**Date**: 2026-11-02
**Status**: accepted

## Context

The SPEC asks for 4 filter models chosen by ear among those of sst-filters and OB-Xf's ZDF filter: a clean multimode, a ladder, an OB-X style model, a diode. `CLAUDE.md` forbids code from a GPL or AGPL project without a recorded decision. MoodzFilter is AGPL v3 (ADR 0001), and playbook ADR 0002 says reuse before coding.

## Options considered

1. Write our own filters (ZDF SVF, ladder, diode): weeks of work and listening to reach what Surge already ships, against playbook ADR 0002.
2. JUCE's `dsp` filters: not usable in `dsp/`, which must not see JUCE, and no OB-X or diode model.
3. sst-filters (Surge Synth Team, GPL v3 or later, header only, no JUCE): 41 four-voice SIMD filter models, including Cytomic SVF, Vintage Ladder, OB-Xd 2 and 4 pole, Diode Ladder, K35; tested upstream on Linux, macOS and Windows.

## Decision

Option 3. sst-filters and its required dependency sst-basic-blocks (GPL v3) are pulled by CPM at pinned commits (`87a171b` and `38cf04a`, no release tags upstream), linked to the `dsp` library only, with their headers as system includes. We use the `filters++` API through our own `dsp::MultimodeFilter`; their code is not copied or modified. GPL v3 is compatible with distributing MoodzFilter under AGPL v3.

## Consequences

The plugin binary includes GPL v3 code: MoodzFilter can never be relicensed under a closed licence without removing sst-filters. Without the `simde` library, sst-basic-blocks builds on x86_64 only; that covers v1 (Windows x64, Linux CI). An ARM build (Windows on ARM, Apple silicon) would need `simde` added by CPM. Updating either commit is a dedicated task, with the golden references rerun.
