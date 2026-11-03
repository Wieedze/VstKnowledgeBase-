# 0007 — Model and passband in one list, no Mode parameter

**Date**: 2026-11-03
**Status**: accepted (amends SPEC v1, supersedes the Mode part of ADR 0006)

## Context

ADR 0006 kept a fixed Mode parameter (low-pass, high-pass, band-pass, notch) for the 5 models, with a passband the model lacks playing low-pass. Task 0009 built it (commit `8c85445`, CI run 41636044276), and Maxime checked it in Live on 2026-11-03 at 14:10 CET: it works as specified. He then asked that a model show only the passbands it really has: no Notch on the Diode Ladder, for example. In VST3 the choices of a parameter are fixed when the plugin loads, and the host keeps them for automation and sessions, so a Mode list cannot follow the selected model. The JUCE generic editor (SPEC v1 interface) always shows every choice.

## Options considered

1. Keep ADR 0006 and show the fallback in the Mode text (`Notch (Low-pass)`).
2. Merge model and passband into the Model list: one entry per pair that exists, no Mode parameter.
3. One Mode parameter per multimode model (`SVF Mode` with 4 choices, `K35 Mode` with 2); the generic editor shows them all, all the time.
4. A custom editor that hides what a model lacks: the SPEC puts a custom interface out of v1.

## Decision

Option 2, chosen by Maxime on 2026-11-03. The Model parameter lists the 9 pairs that exist, in this frozen order: **1 Cytomic SVF Low-pass** (default), **2 Cytomic SVF High-pass**, **3 Cytomic SVF Band-pass**, **4 Cytomic SVF Notch**, **5 Vintage Ladder Low-pass**, **6 OB-Xd 4-pole Low-pass**, **7 Diode Ladder Low-pass**, **8 K35 Low-pass**, **9 K35 High-pass**. There is no Mode parameter and no fallback: every entry plays what its name says. Entries can only be added at the end of the list afterwards. The rest of ADR 0006 stands: the 5 models, the per-model settings for task 0010, blending and a random cutoff curve out of v1.

## Consequences

The SPEC is amended: the Mode row leaves the parameter table, and the Model row lists the 9 entries. Task 0009 is rescoped before it closes: the `filterMode` parameter added in `8c85445` is removed. No release exists, so removing an ID breaks nothing beyond Maxime's test sessions. The parameter ID `filterModel` stays; its list grows from 5 to 9, so a session saved with an earlier test build may load another entry. Automating "the passband" alone is no longer possible: moving from Cytomic SVF Low-pass to High-pass is a change of Model, with the same click as any model change until the crossfade task. Task 0010 has to decide whether the per-model settings (slope, Morph, saturation, sub-model) follow the same rule. Adding them to this list would multiply its entries (the OB-Xd 4-pole alone has 6 slopes), so it should be weighed against separate parameters.
