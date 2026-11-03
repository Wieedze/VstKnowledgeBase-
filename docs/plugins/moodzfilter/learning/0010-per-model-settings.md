# 0010 — Per-model settings: Slope, K35 saturation, Vintage variant

**Date**: 2026-11-03
**Verdict**: pass (1 round)

## What was delivered

Three parameters, as MoodzFilter ADR 0008 decided with Maxime: **Slope** 6 to 24 dB/oct (OB-Xd 4-pole continuously through its Morph mode, Diode Ladder at the nearest 6 dB step), **K35 saturation** 0 to 100 % (sst-filters 0 to 4, 25 % = Mild), **Vintage variant** (the 6 Vintage Ladder sub-models). The Model list keeps its 9 entries. `dsp::filterVariants()` lists the 17 configurations the parameters reach, each prepared once off the audio thread; `dsp::chooseFilter`, a pure function tested without JUCE, picks one per block with its extra value (Morph position or saturation), which sst-filters smooths with the cutoff. The defaults give back the task 0009 sound exactly, OB-Xd Morph at 24 dB included. No golden reference changed. Maxime approved the CI installer in Live on 2026-11-03 at 16:32 CET. Commits `a6d91c0`, `9867411`, `be3815a`, `f3b9092` and the closing commit on `task/0010-per-model-settings`, PR #13.

## What got stuck

Nothing blocked the task. Reading sst-filters before asking Maxime paid off: the K35 continuous saturation covers the fixed steps exactly and the OB-Xd Morph is a crossfade of the pole outputs, so a single continuous Slope control became a real option, and the one he chose.

The version hint test caught a real defect before the first commit: bumping the shared `version` constant to 3 also moved `filterModel`, `cutoff` and `resonance` from hint 2 to 3. The code review then pointed out that the new parameters still used that moving constant; versions are now named per wave (`version::task0003`, `task0008`, `task0010`). The same review found the setting defaults written in four places, now shared constants in `dsp/FilterModels.h`, and a block size test that never changed the extra value, now extended.

Left open by decision: a Slope automated slowly across a Diode step boundary resets the filter on every block it crosses, a burst of clicks; with the click on a Vintage variant change, it goes to the crossfade task (`FUTURE.md`).

Maxime asked to see the filter curve; it is custom-drawn UI (SPEC Out of v1 item 5), planned with the UI tasks of phase 4 in `FUTURE.md`.

## What we change next

* Before offering design options for a third-party model, read how the library implements the setting: it can turn a list into a continuous control.
* A version hint is a constant per wave of additions, never one shared number.
* A continuous parameter that selects discrete configurations needs hysteresis or a crossfade; plan it with the crossfade task.

## Evidence

* `ctest --test-dir Builds --output-on-failure` (Debug, GCC, WSL2) on f3b9092: 63/63.
* `./Builds/MoodzFilterTools check`: `check: all passed`; `render` then `compare Builds/renders tests/golden`: `compare: all files within tolerance`, max error 0.
* `./Builds/DspTests "The default settings give back the task 0009 sound" -s | grep "largest difference"`: 0 on all 9 entries.
* `./Builds/PluginTests "Slope steepens the Diode Ladder step by step" -s | grep "Diode slope"`: −30.8, −41.8, −54.4, −66.8 dB at 4 kHz.
* `./Builds/PluginTests "Slope morphs the OB-Xd 4-pole continuously" -s | grep "OB-Xd slope"`: −16.9, −29.4, −34.7, −41.9, −54.4 dB at 4 kHz for 6, 12, 15, 18, 24 dB.
* `./Builds/PluginTests "K35 saturation adds harmonics" -s | grep "third harmonic"`: −55.9 dB at 0 %, −9.3 dB at 100 %.
* `./Builds/DspTests "Every filter variant stays finite at the bounds" -s | grep "largest peak"`: 2.94, bound 4.
* CI run 41666529712 on f3b9092: Linux, Windows (pluginval 10 `SUCCESS`) and Linux RealtimeSanitizer green.
* TDD red: compile red on the tests; a stub `chooseFilter` failed 5 of 18 dsp filter cases; settings ignored on purpose in `processBlock` failed 3 of 15 plugin filter cases.
