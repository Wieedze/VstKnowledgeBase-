# 0008 — Per-model settings as separate parameters, one continuous slope

**Date**: 2026-11-03
**Status**: accepted (amends SPEC v1, settles the open point of ADRs 0006 and 0007)

## Context

ADR 0006 made the per-model settings v1 parameters: slope on OB-Xd 4-pole and Diode Ladder, Morph on OB-Xd 4-pole, saturation on K35, sub-model on Vintage Ladder. ADR 0007 merged model and passband into the Model list and left open whether these settings join that list too. What sst-filters does with them, read at the pinned commit `87a171b`:

* K35 saturation: the fixed steps None, Mild, Moderate, Heavy, Extreme scale the signal before tanh by 0, 1, 2, 3, 4 (`fut_k35_saturations`, `sst/filters/FilterConfiguration.h:209`). `K35_Continuous` takes an extra value 0..1 and multiplies it by 4 (`FilterCoefficientMaker_Impl.h:342-353`), so a continuous control covers every step, and 0.25 is Mild.
* OB-Xd 4-pole Morph (`Slope_Morph`): an extra value 0..1 crossfades the outputs of the four poles, 0 = 6 dB, 1/3 = 12 dB, 2/3 = 18 dB, 1 = 24 dB per octave (`sst/filters/OBXDFilter.h:134-168`). The extra value goes through `makeCoefficients`, so it is smoothed with the cutoff.
* Diode Ladder slope: only the fixed steps 6, 12, 18, 24 dB, each a different model configuration.
* Vintage Ladder: 6 sub-models (Runge-Kutta, Huovilainen, Huovilainen 2010, each with or without gain compensation), each a different model configuration.

A model configuration is fixed when the filter is prepared, off the audio thread. In VST3 a choice list is fixed at load, and the JUCE generic editor shows every parameter, whatever the model.

## Options considered

1. Every combination in the Model list: about 29 entries, plus a control for Morph and continuous saturation anyway.
2. Mixed: fixed slopes and sub-models in the Model list (about 19 entries), one continuous control shared by Morph and saturation.
3. Separate parameters, the slope as a list (6, 12, 18, 24 dB, Morph) plus a Morph control used by the OB-Xd when the list is on Morph: 4 parameters.
4. Separate parameters, one continuous slope control: 3 parameters.

## Decision

Option 4, chosen by Maxime on 2026-11-03. The Model list stays at its 9 entries. Three parameters are added:

* **Slope**, 6 to 24 dB per octave, continuous. The OB-Xd 4-pole plays it continuously through Morph; the Diode Ladder plays the nearest of its 6, 12, 18, 24 dB steps. Other models ignore it.
* **K35 saturation**, 0 to 100 %, continuous (sst-filters saturation 0 to 4). Used by K35 Low-pass and High-pass.
* **Vintage variant**, a list of the 6 Vintage Ladder sub-models. Used by Vintage Ladder Low-pass.

Defaults give back the task 0009 sound: Slope 24 dB, K35 saturation 25 % (Mild), Vintage variant Runge-Kutta compensated. A parameter has no effect on a model that does not have the setting; the generic editor still shows it. Exact IDs and display text are set in task 0010.

## Consequences

Each Diode Ladder slope and each Vintage Ladder sub-model is its own prepared filter instance, so the processor prepares 17 instead of 9 and only one runs per block. A step of the Diode Ladder slope or a change of Vintage variant switches instance and resets it, so it can click like a Model change; the crossfade task covers both. The OB-Xd 4-pole moves from its fixed 24 dB configuration to Morph, so its default sound must be checked against task 0009. Maxime asked to see the filter curve to understand the slope; a response display is custom-drawn UI, Out of v1 item 5, and stays in `FUTURE.md` until a SPEC change.
