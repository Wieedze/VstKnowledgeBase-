# 0006 — Five filter models, Mode with a low pass fallback, per-model settings

**Date**: 2026-11-03
**Status**: accepted (amends SPEC v1)

## Context

SPEC v1 asked for 4 filter models chosen by ear in phase 2, one per target: a clean multimode, a ladder, an OB-X style model, a diode. It listed "More than 4 filter models" in Out of v1. In task 0008 Maxime played the 7 low pass candidates of `dsp/FilterCandidates.h` in Ableton Live on his own music (2026-11-03, 09:43 CET, CI installer of run 41593592904). He kept 5: Cytomic SVF, Vintage Ladder, OB-Xd 4-pole 24 dB, Diode Ladder 24 dB, K35. He found the low pass candidates alike on headphones (default resonance 20 %, no drive yet) and asked for more character: a user-selectable slope, a blend of models, a random curve on the cutoff.

What sst-filters offers for the 5 models, listed with `Filter::availableModelConfigurations(model, true)` at the pinned commit `87a171b` (probe compiled against `Builds/_deps/sst-filters-src/include`):

| Model | Passbands | Model-specific setting |
| --- | --- | --- |
| Cytomic SVF | low pass, high pass, band pass, notch, peak, all pass, low shelf, bell, high shelf | none |
| Vintage Ladder | low pass | 6 sub-models: Runge-Kutta, Huovilainen, Huovilainen 2010, each with or without gain compensation |
| OB-Xd 4-pole | low pass | slope 6, 12, 18, 24 dB, 24 dB legacy, or Morph (continuous between slopes) |
| Diode Ladder | low pass | slope 6, 12, 18, 24 dB |
| K35 | low pass, high pass | saturation None, Mild, Moderate, Heavy, Extreme, or Continuous |

Only the Cytomic SVF has the 4 passbands of the SPEC's Mode. The JUCE generic editor cannot change the entries of a parameter with the selected model.

## Options considered

1. Keep 4 models, as the SPEC says. Maxime would drop a model he chose by ear.
2. Keep 5 models; Mode as a fixed list of 4 passbands, a passband the model lacks plays low pass; per-model settings exposed as parameters.
3. As option 2, without Mode (everything low pass).
4. As option 2, plus model blending and a random curve on the cutoff in v1.

## Decision

Option 2, chosen by Maxime on 2026-11-03. The Model list is, in this order and frozen from task 0009 on: **1 Cytomic SVF** (default), **2 Vintage Ladder**, **3 OB-Xd 4-pole**, **4 Diode Ladder**, **5 K35**. Models can only be added at the end of the list afterwards. Mode stays a fixed list (low pass, high pass, band pass, notch): the Cytomic SVF plays all 4, the K35 low pass and high pass, and any passband a model lacks plays low pass. The per-model settings of the table above (slope on OB-Xd 4-pole and Diode Ladder, Morph on OB-Xd 4-pole, saturation on K35, sub-model on Vintage Ladder) become v1 parameters; their exact shape (how many parameters, ranges, defaults) is decided in task 0010 by listening. Model blending and a random curve on the cutoff stay out of v1, in `FUTURE.md`, to be weighed again once drive and the LFO exist.

## Consequences

The SPEC is amended: 5 models in the list and the success criteria, Mode with its fallback, per-model settings in the parameter table, "More than 5 filter models" in Out of v1. The work is split: task 0009 freezes the Model list at 5 and adds Mode; task 0010 adds the per-model settings. The parameter ID `filterModel` stays; its list shrinks from 7 to 5 without a state migration because no release exists (task 0008 decision notes), so Maxime's test sessions may load another model afterwards. Model 1 stays the Cytomic SVF, so the render cases, which use the default model wide open, should not change. Only the selected model runs in `processBlock`, so the CPU cost per block does not grow with the list; it is measured at gate 2 as planned.
